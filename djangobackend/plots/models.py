from django.db import models


class Plot(models.Model):
    """One species count recorded at a field site."""

    site = models.CharField(max_length=120)
    species = models.CharField(max_length=120)
    count = models.PositiveIntegerField()
    note = models.TextField(blank=True)
    flagged = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.species} at {self.site} ({self.count})"
