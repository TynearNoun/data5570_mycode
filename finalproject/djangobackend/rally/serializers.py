from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Challenge, FriendGroup, Membership, Message, Reaction, Submission


def display_name_for(user):
    profile = getattr(user, "profile", None)
    if profile and profile.display_name:
        return profile.display_name
    return user.get_username()


class PublicUserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "display_name"]

    def get_display_name(self, user):
        return display_name_for(user)


class UserSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    bio = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "display_name", "bio"]

    def get_display_name(self, user):
        return display_name_for(user)

    def get_bio(self, user):
        profile = getattr(user, "profile", None)
        return profile.bio if profile else ""


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(max_length=80)
    bio = serializers.CharField(max_length=280, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value.strip()).exists():
            raise serializers.ValidationError("That username is taken.")
        return value.strip()

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value.strip()).exists():
            raise serializers.ValidationError("That email is already on an account.")
        return value.strip()

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        bio = validated_data.pop("bio", "")
        display_name = validated_data.pop("display_name").strip()
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        from .models import Profile

        Profile.objects.create(user=user, display_name=display_name, bio=bio)
        return user


class ProfileUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=80)
    bio = serializers.CharField(max_length=280, required=False, allow_blank=True)


class MemberSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="user.id")
    username = serializers.CharField(source="user.username")
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Membership
        fields = ["id", "username", "display_name", "role"]

    def get_display_name(self, membership):
        return display_name_for(membership.user)


class GroupSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    members = MemberSerializer(source="memberships", many=True, read_only=True)

    class Meta:
        model = FriendGroup
        fields = [
            "id",
            "name",
            "description",
            "invite_code",
            "created_at",
            "member_count",
            "role",
            "members",
        ]

    def get_member_count(self, group):
        return group.memberships.count()

    def get_role(self, group):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return ""
        for membership in group.memberships.all():
            if membership.user_id == request.user.id:
                return membership.role
        return ""


class GroupCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    description = serializers.CharField(max_length=280, required=False, allow_blank=True)


class JoinGroupSerializer(serializers.Serializer):
    invite_code = serializers.CharField(max_length=12)


class ReactionSummaryField(serializers.Field):
    def to_representation(self, submission):
        counts = {"fire": 0, "cheer": 0, "laugh": 0}
        mine = []
        request = self.context.get("request")
        user = getattr(request, "user", None)
        for reaction in submission.reactions.all():
            counts[reaction.kind] = counts.get(reaction.kind, 0) + 1
            if user and user.is_authenticated and reaction.user_id == user.id:
                mine.append({"id": reaction.id, "kind": reaction.kind})
        counts["mine"] = mine
        return counts


class SubmissionSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)
    photo_url = serializers.SerializerMethodField()
    reactions = ReactionSummaryField(source="*", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id",
            "challenge",
            "user",
            "body",
            "photo_url",
            "video_url",
            "created_at",
            "reactions",
        ]

    def get_photo_url(self, submission):
        if submission.remote_photo_url:
            return submission.remote_photo_url
        if not submission.photo:
            return ""
        request = self.context.get("request")
        url = submission.photo.url
        if request:
            return request.build_absolute_uri(url)
        return url


class ChallengeSerializer(serializers.ModelSerializer):
    created_by = PublicUserSerializer(read_only=True)
    submission_count = serializers.SerializerMethodField()
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = Challenge
        fields = [
            "id",
            "group",
            "title",
            "prompt",
            "kind",
            "proof",
            "challenge_date",
            "created_by",
            "created_at",
            "submission_count",
            "my_submission",
        ]

    def get_submission_count(self, challenge):
        annotated = getattr(challenge, "submission_total", None)
        if annotated is not None:
            return annotated
        return challenge.submissions.count()

    def get_my_submission(self, challenge):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return None
        for submission in challenge.submissions.all():
            if submission.user_id == user.id:
                return SubmissionSerializer(submission, context=self.context).data
        return None


class ChallengeCreateSerializer(serializers.Serializer):
    group = serializers.IntegerField()
    title = serializers.CharField(max_length=120)
    prompt = serializers.CharField()
    proof = serializers.ChoiceField(choices=Challenge.Proof.choices)
    challenge_date = serializers.DateField(required=False, allow_null=True)


class SubmissionCreateSerializer(serializers.Serializer):
    challenge = serializers.IntegerField()
    body = serializers.CharField(max_length=2000)
    video_url = serializers.URLField(required=False, allow_blank=True, max_length=500)


class SubmissionUpdateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000)
    video_url = serializers.URLField(required=False, allow_blank=True, max_length=500)


class ReactionCreateSerializer(serializers.Serializer):
    submission = serializers.IntegerField()
    kind = serializers.ChoiceField(choices=Reaction.Kind.choices)


class MessageSerializer(serializers.ModelSerializer):
    user = PublicUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "group", "user", "body", "created_at"]


class MessageCreateSerializer(serializers.Serializer):
    group = serializers.IntegerField()
    body = serializers.CharField(max_length=1000)
