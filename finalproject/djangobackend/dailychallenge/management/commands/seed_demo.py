from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from dailychallenge.models import Challenge, FriendGroup, Membership, Message, Profile, Reaction, Submission
from dailychallenge.services import award_challenge, award_reaction, award_submission

PASSWORD = "Rally-demo-19"


class Command(BaseCommand):
    help = "Create the Weeknight Crew demo circle, dares, proof, and chat."

    def handle(self, *args, **options):
        mara = self._user("mara", "mara@rally.dev", "Mara Chen", "Usually walking after dinner.")
        ellis = self._user("ellis", "ellis@rally.dev", "Ellis Okonkwo", "Will react to any photo of a bridge.")
        group, _created = FriendGroup.objects.get_or_create(
            invite_code="WEEKNIGHT",
            defaults={
                "name": "Weeknight Crew",
                "description": "Three friends, one dare a day. Photos encouraged, excuses optional.",
                "created_by": mara,
            },
        )
        Membership.objects.get_or_create(group=group, user=mara, defaults={"role": Membership.Role.OWNER})
        Membership.objects.get_or_create(group=group, user=ellis, defaults={"role": Membership.Role.MEMBER})

        today = timezone.localdate()
        past = [
            (
                4,
                "Same sky",
                "Photograph the sky from where you are.",
                "photo",
                "Flat gray, but the cottonwoods showed up.",
                "Pink at the edges. I stayed out for it.",
            ),
            (
                3,
                "Ten-minute tidy",
                "Put one surface back in order and say what left the pile.",
                "text",
                "The mail pile is down to one envelope.",
                "Cleared the desk. Found two guitar picks.",
            ),
            (
                2,
                "Color hunt",
                "Find something orange without buying it.",
                "any",
                "The mug by the sink. It has been orange for years.",
                "Traffic cone outside the studio. I did not take it home.",
            ),
            (
                1,
                "One good song",
                "Send a song and one sentence on why it fits the hour.",
                "text",
                "A slow one for washing dishes. The kitchen felt smaller.",
                "Played it on the walk home. The chorus hit at the corner.",
            ),
        ]
        for offset, title, prompt, proof, mara_body, ellis_body in past:
            challenge = self._daily(group, today - timedelta(days=offset), title, prompt, proof)
            self._proof(challenge, mara, mara_body)
            self._proof(challenge, ellis, ellis_body)

        today_challenge = self._daily(
            group,
            today,
            "Two-song walk",
            "Step outside and walk until two songs finish. Tell the group where the second song ended.",
            "text",
        )
        ellis_today = self._proof(today_challenge, ellis, "The second song ended at the creek bridge.")

        custom, custom_created = Challenge.objects.get_or_create(
            group=group,
            kind=Challenge.Kind.CUSTOM,
            title="Bring a snack tomorrow",
            defaults={
                "prompt": "Pack something you would actually share. Tell the group what it is before you leave the house.",
                "proof": Challenge.Proof.ANY,
                "challenge_date": today + timedelta(days=1),
                "created_by": mara,
            },
        )
        if custom_created:
            award_challenge(custom)

        if ellis_today and not Reaction.objects.filter(submission=ellis_today, user=mara, kind=Reaction.Kind.FIRE).exists():
            reaction = Reaction.objects.create(
                submission=ellis_today,
                user=mara,
                kind=Reaction.Kind.FIRE,
            )
            award_reaction(reaction)

        if not Message.objects.filter(group=group).exists():
            Message.objects.create(group=group, user=ellis, body="I'm doing the walk on the creek path.")
            Message.objects.create(
                group=group,
                user=mara,
                body="Save me a photo of the bridge if you get that far.",
            )

        self.stdout.write(self.style.SUCCESS("Demo circle is ready."))
        self.stdout.write("Group: Weeknight Crew")
        self.stdout.write("Invite code: WEEKNIGHT")
        self.stdout.write("Mara Chen  username mara   password Rally-demo-19")
        self.stdout.write("Ellis Okonkwo  username ellis  password Rally-demo-19")

    def _user(self, username, email, display_name, bio):
        user, created = User.objects.get_or_create(username=username, defaults={"email": email})
        if created:
            user.set_password(PASSWORD)
            user.save()
        Profile.objects.get_or_create(user=user, defaults={"display_name": display_name, "bio": bio})
        return user

    def _daily(self, group, day, title, prompt, proof):
        challenge, _created = Challenge.objects.get_or_create(
            group=group,
            kind=Challenge.Kind.DAILY,
            challenge_date=day,
            defaults={
                "title": title,
                "prompt": prompt,
                "proof": proof,
                "created_by": None,
            },
        )
        return challenge

    def _proof(self, challenge, user, body):
        submission, created = Submission.objects.get_or_create(
            challenge=challenge,
            user=user,
            defaults={"body": body},
        )
        if created:
            award_submission(submission)
        return submission
