from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Challenge, FriendGroup, Membership, Message, Reaction, Submission
from .prompts import PROMPTS
from .serializers import (
    ChallengeCreateSerializer,
    ChallengeSerializer,
    GroupCreateSerializer,
    GroupSerializer,
    JoinGroupSerializer,
    MessageCreateSerializer,
    MessageSerializer,
    ProfileUpdateSerializer,
    ReactionCreateSerializer,
    RegisterSerializer,
    SubmissionCreateSerializer,
    SubmissionSerializer,
    SubmissionUpdateSerializer,
    UserSerializer,
)
from .services import (
    award_challenge,
    award_reaction,
    award_submission,
    ensure_daily,
    leaderboard,
    make_invite_code,
    maybe_upload_to_s3,
)


def user_payload(user):
    return UserSerializer(user).data


def challenge_queryset():
    return (
        Challenge.objects.select_related("created_by", "created_by__profile")
        .prefetch_related(
            Prefetch(
                "submissions",
                queryset=Submission.objects.select_related("user", "user__profile").prefetch_related(
                    "reactions"
                ),
            )
        )
        .annotate(submission_total=Count("submissions"))
    )


def submission_queryset():
    return Submission.objects.select_related(
        "user",
        "user__profile",
        "challenge",
        "challenge__group",
    ).prefetch_related("reactions")


def group_queryset():
    return FriendGroup.objects.prefetch_related(
        "memberships",
        "memberships__user",
        "memberships__user__profile",
    )


def membership_for(user, group_id):
    group = group_queryset().filter(pk=group_id).first()
    if not group:
        return None, Response({"detail": "No group with that id."}, status=status.HTTP_404_NOT_FOUND)
    membership = next((item for item in group.memberships.all() if item.user_id == user.id), None)
    if not membership:
        return None, Response(
            {"detail": "Join this group before using it."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return (group, membership), None


def proof_is_complete(challenge, body, photo, video_url):
    if challenge.proof == Challenge.Proof.PHOTO and not photo:
        return "This challenge asks for a photo."
    if challenge.proof == Challenge.Proof.VIDEO and not video_url:
        return "This challenge asks for a video link."
    if not body.strip():
        return "Write a few words with your proof."
    return ""


class DareBankView(APIView):
    def get(self, request):
        return Response(
            [
                {"title": title, "prompt": prompt, "proof": proof}
                for title, prompt, proof in PROMPTS
            ]
        )


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "dailychallenge"})


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {"token": token.key, "user": user_payload(user)},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", ""))
        user = authenticate(username=username, password=password)
        if not user:
            match = User.objects.filter(email__iexact=username).first()
            if match:
                user = authenticate(username=match.username, password=password)
        if not user:
            return Response(
                {"detail": "Those credentials did not match an account."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": user_payload(user)})


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(user_payload(request.user))

    def put(self, request):
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = request.user.profile
        profile.display_name = serializer.validated_data["display_name"].strip()
        profile.bio = serializer.validated_data.get("bio", "")
        profile.save(update_fields=["display_name", "bio"])
        return Response(user_payload(request.user))


class GroupListCreateView(APIView):
    def get(self, request):
        groups = group_queryset().filter(memberships__user=request.user).distinct()
        return Response(GroupSerializer(groups, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = GroupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            group = FriendGroup.objects.create(
                name=serializer.validated_data["name"].strip(),
                description=serializer.validated_data.get("description", "").strip(),
                invite_code=make_invite_code(),
                created_by=request.user,
            )
            Membership.objects.create(group=group, user=request.user, role=Membership.Role.OWNER)
        group = group_queryset().get(pk=group.pk)
        return Response(
            GroupSerializer(group, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class GroupDetailView(APIView):
    def get(self, request, group_id):
        found, error = membership_for(request.user, group_id)
        if error:
            return error
        group, _membership = found
        return Response(GroupSerializer(group, context={"request": request}).data)


class GroupJoinView(APIView):
    def post(self, request):
        serializer = JoinGroupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        code = serializer.validated_data["invite_code"].strip().upper()
        group = group_queryset().filter(invite_code__iexact=code).first()
        if not group:
            return Response(
                {"detail": "That invite code does not match a group."},
                status=status.HTTP_404_NOT_FOUND,
            )
        Membership.objects.get_or_create(
            group=group,
            user=request.user,
            defaults={"role": Membership.Role.MEMBER},
        )
        group = group_queryset().get(pk=group.pk)
        return Response(GroupSerializer(group, context={"request": request}).data)


class ChallengeListCreateView(APIView):
    def get(self, request):
        group_id = request.query_params.get("group")
        if not group_id:
            return Response(
                {"detail": "Pass a group id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        found, error = membership_for(request.user, group_id)
        if error:
            return error
        group, _membership = found
        challenges = challenge_queryset().filter(group=group)
        return Response(ChallengeSerializer(challenges, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = ChallengeCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        found, error = membership_for(request.user, serializer.validated_data["group"])
        if error:
            return error
        group, _membership = found
        challenge = Challenge.objects.create(
            group=group,
            title=serializer.validated_data["title"].strip(),
            prompt=serializer.validated_data["prompt"].strip(),
            kind=Challenge.Kind.CUSTOM,
            proof=serializer.validated_data["proof"],
            challenge_date=serializer.validated_data.get("challenge_date"),
            created_by=request.user,
        )
        award_challenge(challenge)
        challenge = challenge_queryset().get(pk=challenge.pk)
        return Response(
            ChallengeSerializer(challenge, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ChallengeDetailView(APIView):
    def get(self, request, challenge_id):
        challenge = challenge_queryset().filter(pk=challenge_id).first()
        if not challenge:
            return Response({"detail": "No challenge with that id."}, status=status.HTTP_404_NOT_FOUND)
        _found, error = membership_for(request.user, challenge.group_id)
        if error:
            return error
        return Response(ChallengeSerializer(challenge, context={"request": request}).data)


class DailyChallengeView(APIView):
    def post(self, request):
        group_id = request.data.get("group")
        if not group_id:
            return Response({"detail": "Pass a group id."}, status=status.HTTP_400_BAD_REQUEST)
        found, error = membership_for(request.user, group_id)
        if error:
            return error
        group, _membership = found
        challenge, created = ensure_daily(group)
        challenge = challenge_queryset().get(pk=challenge.pk)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(ChallengeSerializer(challenge, context={"request": request}).data, status=code)


class SubmissionListCreateView(APIView):
    def get(self, request):
        challenge_id = request.query_params.get("challenge")
        group_id = request.query_params.get("group")
        if challenge_id:
            challenge = get_object_or_404(Challenge, pk=challenge_id)
            _found, error = membership_for(request.user, challenge.group_id)
            if error:
                return error
            submissions = submission_queryset().filter(challenge=challenge)
        elif group_id:
            found, error = membership_for(request.user, group_id)
            if error:
                return error
            group, _membership = found
            submissions = submission_queryset().filter(challenge__group=group)
        else:
            return Response(
                {"detail": "Pass a challenge id or a group id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(SubmissionSerializer(submissions, many=True, context={"request": request}).data)

    def post(self, request):
        serializer = SubmissionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = challenge_queryset().filter(pk=serializer.validated_data["challenge"]).first()
        if not challenge:
            return Response({"detail": "No challenge with that id."}, status=status.HTTP_404_NOT_FOUND)
        _found, error = membership_for(request.user, challenge.group_id)
        if error:
            return error
        if Submission.objects.filter(challenge=challenge, user=request.user).exists():
            return Response(
                {"detail": "You already turned in proof for this challenge."},
                status=status.HTTP_409_CONFLICT,
            )

        body = serializer.validated_data["body"].strip()
        video_url = serializer.validated_data.get("video_url", "").strip()
        photo = request.FILES.get("photo")
        problem = proof_is_complete(challenge, body, photo, video_url)
        if problem:
            return Response({"detail": problem}, status=status.HTTP_400_BAD_REQUEST)

        remote_url = maybe_upload_to_s3(photo) if photo else ""
        with transaction.atomic():
            submission = Submission(
                challenge=challenge,
                user=request.user,
                body=body,
                video_url=video_url,
                remote_photo_url=remote_url,
            )
            if photo and not remote_url:
                submission.photo = photo
            submission.save()
            award_submission(submission)
        submission = submission_queryset().get(pk=submission.pk)
        return Response(
            SubmissionSerializer(submission, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class SubmissionDetailView(APIView):
    def put(self, request, submission_id):
        submission = submission_queryset().filter(pk=submission_id).first()
        if not submission:
            return Response({"detail": "No proof with that id."}, status=status.HTTP_404_NOT_FOUND)
        if submission.user_id != request.user.id:
            return Response(
                {"detail": "You can only edit your own proof."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = SubmissionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        body = serializer.validated_data["body"].strip()
        video_url = serializer.validated_data.get("video_url", submission.video_url).strip()
        photo = request.FILES.get("photo")
        problem = proof_is_complete(submission.challenge, body, photo or submission.photo or submission.remote_photo_url, video_url)
        if problem:
            return Response({"detail": problem}, status=status.HTTP_400_BAD_REQUEST)
        submission.body = body
        submission.video_url = video_url
        if photo:
            remote_url = maybe_upload_to_s3(photo)
            if remote_url:
                submission.remote_photo_url = remote_url
                submission.photo = ""
            else:
                submission.photo = photo
        submission.save()
        submission = submission_queryset().get(pk=submission.pk)
        return Response(SubmissionSerializer(submission, context={"request": request}).data)


class ReactionListCreateView(APIView):
    def post(self, request):
        serializer = ReactionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission = submission_queryset().filter(pk=serializer.validated_data["submission"]).first()
        if not submission:
            return Response({"detail": "No proof with that id."}, status=status.HTTP_404_NOT_FOUND)
        _found, error = membership_for(request.user, submission.challenge.group_id)
        if error:
            return error
        if submission.user_id == request.user.id:
            return Response(
                {"detail": "React to someone else's proof."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        reaction, created = Reaction.objects.get_or_create(
            submission=submission,
            user=request.user,
            kind=serializer.validated_data["kind"],
        )
        if created:
            award_reaction(reaction)
        submission = submission_queryset().get(pk=submission.pk)
        code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(SubmissionSerializer(submission, context={"request": request}).data, status=code)


class ReactionDetailView(APIView):
    def delete(self, request, reaction_id):
        reaction = Reaction.objects.select_related("submission").filter(pk=reaction_id).first()
        if not reaction:
            return Response({"detail": "No reaction with that id."}, status=status.HTTP_404_NOT_FOUND)
        if reaction.user_id != request.user.id:
            return Response(
                {"detail": "You can only remove your own reaction."},
                status=status.HTTP_403_FORBIDDEN,
            )
        submission_id = reaction.submission_id
        reaction.delete()
        submission = submission_queryset().get(pk=submission_id)
        return Response(SubmissionSerializer(submission, context={"request": request}).data)


class MessageListCreateView(APIView):
    def get(self, request):
        group_id = request.query_params.get("group")
        if not group_id:
            return Response({"detail": "Pass a group id."}, status=status.HTTP_400_BAD_REQUEST)
        found, error = membership_for(request.user, group_id)
        if error:
            return error
        group, _membership = found
        messages = list(
            Message.objects.filter(group=group)
            .select_related("user", "user__profile")
            .order_by("-created_at")[:200]
        )
        messages.reverse()
        return Response(MessageSerializer(messages, many=True).data)

    def post(self, request):
        serializer = MessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        found, error = membership_for(request.user, serializer.validated_data["group"])
        if error:
            return error
        group, _membership = found
        body = serializer.validated_data["body"].strip()
        if not body:
            return Response({"detail": "Write a message first."}, status=status.HTTP_400_BAD_REQUEST)
        message = Message.objects.create(group=group, user=request.user, body=body)
        message = Message.objects.select_related("user", "user__profile").get(pk=message.pk)
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class LeaderboardView(APIView):
    def get(self, request):
        group_id = request.query_params.get("group")
        if not group_id:
            return Response({"detail": "Pass a group id."}, status=status.HTTP_400_BAD_REQUEST)
        found, error = membership_for(request.user, group_id)
        if error:
            return error
        group, _membership = found
        return Response(
            {
                "group": {"id": group.id, "name": group.name},
                "standings": leaderboard(group),
            }
        )
