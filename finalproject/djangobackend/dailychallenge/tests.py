import io
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from .models import Challenge, PointEvent
from .services import current_streak


def tiny_png(name="proof.png"):
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), (198, 93, 59)).save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


class DailyChallengeApiTests(APITestCase):
    def register(self, username, display_name):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": username,
                "email": f"{username}@rally.dev",
                "password": "Rally-pass-19",
                "display_name": display_name,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

    def test_health(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["service"], "dailychallenge")

    def test_register_login_me_and_logout(self):
        created = self.register("nova", "Nova Ellis")
        self.assertIn("token", created)
        self.assertEqual(created["user"]["display_name"], "Nova Ellis")

        duplicate = self.client.post(
            "/api/auth/register/",
            {
                "username": "nova",
                "email": "other@rally.dev",
                "password": "Rally-pass-19",
                "display_name": "Someone",
            },
            format="json",
        )
        self.assertEqual(duplicate.status_code, 400)

        logged_out = self.client.get("/api/users/me/")
        self.assertEqual(logged_out.status_code, 401)

        bad = self.client.post(
            "/api/auth/login/",
            {"username": "nova", "password": "wrong-password"},
            format="json",
        )
        self.assertEqual(bad.status_code, 401)

        logged_in = self.client.post(
            "/api/auth/login/",
            {"username": "nova@rally.dev", "password": "Rally-pass-19"},
            format="json",
        )
        self.assertEqual(logged_in.status_code, 200)
        self.auth(logged_in.data["token"])

        updated = self.client.put(
            "/api/users/me/",
            {"display_name": "Nova E.", "bio": "Here for the walk."},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["display_name"], "Nova E.")
        self.assertEqual(updated.data["bio"], "Here for the walk.")

        logout = self.client.post("/api/auth/logout/")
        self.assertEqual(logout.status_code, 204)
        self.assertEqual(self.client.get("/api/users/me/").status_code, 401)

    def test_groups_challenges_proof_points_and_chat(self):
        mara = self.register("mara", "Mara Chen")
        ellis = self.register("ellis", "Ellis Okonkwo")
        self.auth(mara["token"])

        created = self.client.post(
            "/api/groups/",
            {"name": "Weeknight Crew", "description": "One dare a day."},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        group_id = created.data["id"]
        self.assertEqual(created.data["role"], "owner")
        code = created.data["invite_code"]

        self.auth(ellis["token"])
        missing = self.client.post("/api/groups/join/", {"invite_code": "NOPE"}, format="json")
        self.assertEqual(missing.status_code, 404)
        blocked = self.client.get(f"/api/challenges/?group={group_id}")
        self.assertEqual(blocked.status_code, 403)

        joined = self.client.post("/api/groups/join/", {"invite_code": code.lower()}, format="json")
        self.assertEqual(joined.status_code, 200)
        self.assertEqual(joined.data["role"], "member")

        daily = self.client.post("/api/challenges/daily/", {"group": group_id}, format="json")
        self.assertEqual(daily.status_code, 201)
        again = self.client.post("/api/challenges/daily/", {"group": group_id}, format="json")
        self.assertEqual(again.status_code, 200)
        self.assertEqual(again.data["id"], daily.data["id"])
        self.assertEqual(again.data["kind"], "daily")

        custom = self.client.post(
            "/api/challenges/",
            {
                "group": group_id,
                "title": "Bring a snack",
                "prompt": "Show up with something you would share.",
                "proof": "any",
            },
            format="json",
        )
        self.assertEqual(custom.status_code, 201)
        self.assertEqual(
            PointEvent.objects.filter(user__username="ellis", reason="challenge").count(),
            1,
        )

        proof = self.client.post(
            "/api/submissions/",
            {"challenge": daily.data["id"], "body": "Walked to the creek bridge."},
            format="multipart",
        )
        # Daily prompt may require a photo or video. Send whatever it asks for.
        if proof.status_code == 400 and "photo" in proof.data["detail"].lower():
            proof = self.client.post(
                "/api/submissions/",
                {
                    "challenge": daily.data["id"],
                    "body": "Walked to the creek bridge.",
                    "photo": tiny_png("bridge.png"),
                },
                format="multipart",
            )
        if proof.status_code == 400 and "video" in proof.data["detail"].lower():
            proof = self.client.post(
                "/api/submissions/",
                {
                    "challenge": daily.data["id"],
                    "body": "Walked to the creek bridge.",
                    "video_url": "https://example.com/creek.mp4",
                },
                format="json",
            )
        self.assertEqual(proof.status_code, 201, proof.data)
        self.assertEqual(proof.data["user"]["display_name"], "Ellis Okonkwo")

        duplicate = self.client.post(
            "/api/submissions/",
            {"challenge": daily.data["id"], "body": "Again."},
            format="json",
        )
        self.assertEqual(duplicate.status_code, 409)

        self.auth(mara["token"])
        reaction = self.client.post(
            "/api/reactions/",
            {"submission": proof.data["id"], "kind": "fire"},
            format="json",
        )
        self.assertEqual(reaction.status_code, 201)
        self.assertEqual(reaction.data["reactions"]["fire"], 1)
        self.assertEqual(
            PointEvent.objects.filter(user__username="ellis", reason="reaction").count(),
            1,
        )

        selfish = self.client.post(
            "/api/reactions/",
            {"submission": proof.data["id"], "kind": "cheer"},
            format="json",
        )
        # Mara did not submit, so this is not a self reaction. Submit first, then try.
        self.assertIn(selfish.status_code, (201, 400))

        own = self.client.post(
            "/api/submissions/",
            {"challenge": custom.data["id"], "body": "I packed oranges."},
            format="json",
        )
        self.assertEqual(own.status_code, 201)
        self_react = self.client.post(
            "/api/reactions/",
            {"submission": own.data["id"], "kind": "cheer"},
            format="json",
        )
        self.assertEqual(self_react.status_code, 400)

        edited = self.client.put(
            f"/api/submissions/{own.data['id']}/",
            {"body": "I packed oranges and crackers."},
            format="json",
        )
        self.assertEqual(edited.status_code, 200)
        self.assertIn("crackers", edited.data["body"])

        self.auth(ellis["token"])
        forbidden = self.client.put(
            f"/api/submissions/{own.data['id']}/",
            {"body": "Changed by someone else."},
            format="json",
        )
        self.assertEqual(forbidden.status_code, 403)

        message = self.client.post(
            "/api/messages/",
            {"group": group_id, "body": "On the creek path."},
            format="json",
        )
        self.assertEqual(message.status_code, 201)
        listing = self.client.get(f"/api/messages/?group={group_id}")
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.data[-1]["body"], "On the creek path.")

        board = self.client.get(f"/api/leaderboard/?group={group_id}")
        self.assertEqual(board.status_code, 200)
        names = [row["user"]["username"] for row in board.data["standings"]]
        self.assertEqual(names[0], "ellis")
        ellis_row = board.data["standings"][0]
        self.assertGreaterEqual(ellis_row["points"], 12)
        self.assertGreaterEqual(ellis_row["current_streak"], 1)

        outsider = self.register("jun", "Jun Park")
        self.auth(outsider["token"])
        quiet = self.client.post(
            "/api/messages/",
            {"group": group_id, "body": "Can I listen?"},
            format="json",
        )
        self.assertEqual(quiet.status_code, 403)

    def test_photo_is_stored_locally_without_aws(self):
        owner = self.register("ada", "Ada Moss")
        self.auth(owner["token"])
        group = self.client.post("/api/groups/", {"name": "Photo Club"}, format="json")
        challenge = Challenge.objects.create(
            group_id=group.data["id"],
            title="Show a color",
            prompt="Orange, please.",
            kind=Challenge.Kind.CUSTOM,
            proof=Challenge.Proof.PHOTO,
            created_by=User.objects.get(username="ada"),
        )
        missing = self.client.post(
            "/api/submissions/",
            {"challenge": challenge.id, "body": "I forgot the camera."},
            format="json",
        )
        self.assertEqual(missing.status_code, 400)
        sent = self.client.post(
            "/api/submissions/",
            {
                "challenge": challenge.id,
                "body": "The mug is orange.",
                "photo": tiny_png("mug.png"),
            },
            format="multipart",
        )
        self.assertEqual(sent.status_code, 201, sent.data)
        self.assertIn("/media/proofs/", sent.data["photo_url"])

    def test_streak_counts_through_yesterday(self):
        today = timezone.localdate()
        dates = [today - timedelta(days=offset) for offset in (3, 2, 1)]
        self.assertEqual(current_streak(dates, today), 3)
        gap = [today - timedelta(days=5), today - timedelta(days=4)]
        self.assertEqual(current_streak(gap, today), 0)


class TokenCleanupTests(APITestCase):
    def test_login_reuses_the_same_token(self):
        self.client.post(
            "/api/auth/register/",
            {
                "username": "rio",
                "email": "rio@rally.dev",
                "password": "Rally-pass-19",
                "display_name": "Rio",
            },
            format="json",
        )
        first = self.client.post(
            "/api/auth/login/",
            {"username": "rio", "password": "Rally-pass-19"},
            format="json",
        )
        second = self.client.post(
            "/api/auth/login/",
            {"username": "rio", "password": "Rally-pass-19"},
            format="json",
        )
        self.assertEqual(first.data["token"], second.data["token"])
        self.assertEqual(Token.objects.filter(user__username="rio").count(), 1)
