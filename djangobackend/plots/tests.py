from django.test import TestCase
from rest_framework.test import APIClient

from plots.models import Plot


class PlotApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_seeded_plots_are_present(self):
        species = set(Plot.objects.values_list("species", flat=True))
        self.assertTrue({"American robin", "Painted turtle", "Monarch"} <= species)

    def test_get_returns_plots(self):
        Plot.objects.create(
            site="Cedar Bend",
            species="American robin",
            count=6,
            note="Foraging along the gravel bar.",
        )
        response = self.client.get("/api/plots/")
        self.assertEqual(response.status_code, 200)
        species = [row["species"] for row in response.data]
        self.assertIn("American robin", species)

    def test_post_creates_plot(self):
        before = Plot.objects.count()
        response = self.client.post(
            "/api/plots/",
            {
                "site": "Mill Race",
                "species": "Painted turtle",
                "count": 2,
                "note": "Basking on the south log.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Plot.objects.count(), before + 1)
        self.assertEqual(response.data["species"], "Painted turtle")
        self.assertFalse(response.data["flagged"])

    def test_post_rejects_empty_names_and_zero_count(self):
        response = self.client.post(
            "/api/plots/",
            {"site": "  ", "species": "", "count": 0, "note": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_patch_flag_and_delete(self):
        plot = Plot.objects.create(site="Oak Ridge", species="Monarch", count=11, note="")
        patched = self.client.patch(
            f"/api/plots/{plot.id}/",
            {"flagged": True},
            format="json",
        )
        self.assertEqual(patched.status_code, 200)
        self.assertTrue(patched.data["flagged"])

        deleted = self.client.delete(f"/api/plots/{plot.id}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Plot.objects.filter(pk=plot.id).exists())

    def test_cors_allows_expo_web_origin(self):
        response = self.client.get("/api/plots/", HTTP_ORIGIN="http://localhost:8081")
        self.assertEqual(response.status_code, 200)
        self.assertIn(
            response["Access-Control-Allow-Origin"],
            ("*", "http://localhost:8081"),
        )
