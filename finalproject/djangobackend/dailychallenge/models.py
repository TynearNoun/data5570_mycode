from django.conf import settings
from django.db import models
from django.db.models import Q


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    display_name = models.CharField(max_length=80)
    bio = models.CharField(max_length=280, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "dailychallenge_profile"

    def __str__(self):
        return self.display_name


class FriendGroup(models.Model):
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=280, blank=True)
    invite_code = models.CharField(max_length=12, unique=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="groups_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Membership(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        MEMBER = "member", "Member"

    group = models.ForeignKey(FriendGroup, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["group", "user"], name="unique_group_member"),
        ]

    def __str__(self):
        return f"{self.user_id} in {self.group_id}"


class Challenge(models.Model):
    class Kind(models.TextChoices):
        DAILY = "daily", "Daily"
        CUSTOM = "custom", "Custom"

    class Proof(models.TextChoices):
        TEXT = "text", "Text"
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"
        ANY = "any", "Any"

    group = models.ForeignKey(FriendGroup, on_delete=models.CASCADE, related_name="challenges")
    title = models.CharField(max_length=120)
    prompt = models.TextField()
    kind = models.CharField(max_length=16, choices=Kind.choices)
    proof = models.CharField(max_length=16, choices=Proof.choices, default=Proof.ANY)
    challenge_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="challenges_created",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-challenge_date", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["group", "challenge_date"],
                condition=Q(kind="daily"),
                name="one_daily_challenge_per_group_date",
            ),
        ]
        indexes = [
            models.Index(fields=["group", "challenge_date"]),
        ]

    def __str__(self):
        return self.title


class Submission(models.Model):
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name="submissions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    body = models.TextField()
    photo = models.ImageField(upload_to="proofs/", blank=True)
    remote_photo_url = models.CharField(max_length=500, blank=True)
    video_url = models.URLField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["challenge", "user"], name="one_proof_per_user"),
        ]

    def __str__(self):
        return f"Proof {self.pk} on challenge {self.challenge_id}"


class Reaction(models.Model):
    class Kind(models.TextChoices):
        FIRE = "fire", "Fire"
        CHEER = "cheer", "Cheer"
        LAUGH = "laugh", "Laugh"

    submission = models.ForeignKey(Submission, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reactions",
    )
    kind = models.CharField(max_length=16, choices=Kind.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["submission", "user", "kind"],
                name="one_reaction_kind_per_user",
            ),
        ]

    def __str__(self):
        return f"{self.kind} on {self.submission_id}"


class Message(models.Model):
    group = models.ForeignKey(FriendGroup, on_delete=models.CASCADE, related_name="messages")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["group", "created_at"]),
        ]

    def __str__(self):
        return f"Message {self.pk} in {self.group_id}"


class PointEvent(models.Model):
    """Ledger of points. The leaderboard sums these rows instead of storing a mutable total."""

    class Reason(models.TextChoices):
        SUBMISSION = "submission", "Submission"
        REACTION = "reaction", "Reaction"
        CHALLENGE = "challenge", "Challenge"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="point_events",
    )
    group = models.ForeignKey(FriendGroup, on_delete=models.CASCADE, related_name="point_events")
    challenge = models.ForeignKey(
        Challenge,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="point_events",
    )
    submission = models.ForeignKey(
        Submission,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="point_events",
    )
    reaction = models.ForeignKey(
        Reaction,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="point_events",
    )
    points = models.PositiveSmallIntegerField()
    reason = models.CharField(max_length=20, choices=Reason.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["group", "user"]),
        ]

    def __str__(self):
        return f"{self.points} {self.reason} for {self.user_id}"
