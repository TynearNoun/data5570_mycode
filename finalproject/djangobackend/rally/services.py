"""Points, streaks, daily-challenge selection, and optional S3 uploads."""

import os
import secrets
import uuid
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.utils import timezone

from .models import Challenge, FriendGroup, PointEvent, Submission
from .prompts import PROMPTS

SUBMISSION_POINTS = 10
REACTION_POINTS = 2
CHALLENGE_POINTS = 3


def make_invite_code():
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(8):
        code = "".join(secrets.choice(alphabet) for _ in range(8))
        if not FriendGroup.objects.filter(invite_code=code).exists():
            return code
    return uuid.uuid4().hex[:12].upper()


def prompt_for(group_id, day):
    index = (group_id * 17 + day.toordinal()) % len(PROMPTS)
    return PROMPTS[index]


def ensure_daily(group):
    """Return today's daily challenge for a group, creating it once."""
    today = timezone.localdate()
    existing = Challenge.objects.filter(
        group=group,
        kind=Challenge.Kind.DAILY,
        challenge_date=today,
    ).first()
    if existing:
        return existing, False

    title, prompt, proof = prompt_for(group.pk, today)
    try:
        with transaction.atomic():
            challenge = Challenge.objects.create(
                group=group,
                title=title,
                prompt=prompt,
                kind=Challenge.Kind.DAILY,
                proof=proof,
                challenge_date=today,
                created_by=None,
            )
        return challenge, True
    except IntegrityError:
        challenge = Challenge.objects.get(
            group=group,
            kind=Challenge.Kind.DAILY,
            challenge_date=today,
        )
        return challenge, False


def award_submission(submission):
    if PointEvent.objects.filter(
        submission=submission,
        reason=PointEvent.Reason.SUBMISSION,
    ).exists():
        return None
    return PointEvent.objects.create(
        user=submission.user,
        group=submission.challenge.group,
        challenge=submission.challenge,
        submission=submission,
        points=SUBMISSION_POINTS,
        reason=PointEvent.Reason.SUBMISSION,
    )


def award_reaction(reaction):
    if reaction.user_id == reaction.submission.user_id:
        return None
    if PointEvent.objects.filter(reaction=reaction).exists():
        return None
    return PointEvent.objects.create(
        user=reaction.submission.user,
        group=reaction.submission.challenge.group,
        challenge=reaction.submission.challenge,
        submission=reaction.submission,
        reaction=reaction,
        points=REACTION_POINTS,
        reason=PointEvent.Reason.REACTION,
    )


def award_challenge(challenge):
    if challenge.kind != Challenge.Kind.CUSTOM or not challenge.created_by_id:
        return None
    if PointEvent.objects.filter(
        challenge=challenge,
        user=challenge.created_by,
        reason=PointEvent.Reason.CHALLENGE,
    ).exists():
        return None
    return PointEvent.objects.create(
        user=challenge.created_by,
        group=challenge.group,
        challenge=challenge,
        points=CHALLENGE_POINTS,
        reason=PointEvent.Reason.CHALLENGE,
    )


def _daily_dates(user, group):
    return list(
        Submission.objects.filter(
            user=user,
            challenge__group=group,
            challenge__kind=Challenge.Kind.DAILY,
            challenge__challenge_date__isnull=False,
        )
        .order_by("challenge__challenge_date")
        .values_list("challenge__challenge_date", flat=True)
        .distinct()
    )


def current_streak(dates, today):
    if not dates:
        return 0
    dayset = set(dates)
    cursor = today if today in dayset else today - timedelta(days=1)
    if cursor not in dayset:
        return 0
    streak = 0
    while cursor in dayset:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def best_streak(dates):
    ordered = sorted(set(dates))
    if not ordered:
        return 0
    best = run = 1
    for previous, current in zip(ordered, ordered[1:]):
        if (current - previous).days == 1:
            run += 1
            best = max(best, run)
        else:
            run = 1
    return best


def points_for(user, group):
    total = PointEvent.objects.filter(user=user, group=group).aggregate(total=Sum("points"))
    return total["total"] or 0


def standing_row(membership):
    user = membership.user
    group = membership.group
    dates = _daily_dates(user, group)
    today = timezone.localdate()
    profile = getattr(user, "profile", None)
    display_name = profile.display_name if profile else user.get_username()
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "display_name": display_name,
        },
        "points": points_for(user, group),
        "current_streak": current_streak(dates, today),
        "best_streak": best_streak(dates),
        "submissions": Submission.objects.filter(user=user, challenge__group=group).count(),
    }


def leaderboard(group):
    rows = [
        standing_row(membership)
        for membership in group.memberships.select_related("user", "user__profile")
    ]
    rows.sort(key=lambda row: (-row["points"], -row["current_streak"], row["user"]["display_name"].lower()))
    for index, row in enumerate(rows, start=1):
        row["rank"] = index
    return rows


def maybe_upload_to_s3(uploaded):
    """Upload a proof photo when AWS credentials are configured. Otherwise return ""."""
    bucket = os.environ.get("AWS_STORAGE_BUCKET_NAME", "").strip()
    key_id = os.environ.get("AWS_ACCESS_KEY_ID", "").strip()
    secret = os.environ.get("AWS_SECRET_ACCESS_KEY", "").strip()
    if not (bucket and key_id and secret):
        return ""

    import boto3
    from botocore.exceptions import BotoCoreError, ClientError

    region = os.environ.get("AWS_S3_REGION", "us-west-1").strip() or "us-west-1"
    extension = os.path.splitext(getattr(uploaded, "name", "") or "")[1].lower() or ".jpg"
    key = f"proofs/{uuid.uuid4().hex}{extension}"
    content_type = getattr(uploaded, "content_type", None) or "application/octet-stream"
    try:
        client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=key_id,
            aws_secret_access_key=secret,
        )
        uploaded.seek(0)
        client.upload_fileobj(
            uploaded,
            bucket,
            key,
            ExtraArgs={"ContentType": content_type},
        )
    except (BotoCoreError, ClientError, OSError):
        uploaded.seek(0)
        return ""
    uploaded.seek(0)
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
