from rest_framework import serializers

from .models import Plot


class PlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plot
        fields = ["id", "site", "species", "count", "note", "flagged", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_site(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Add a site name before saving.")
        return cleaned

    def validate_species(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Add a species name before saving.")
        return cleaned

    def validate_count(self, value):
        if value < 1:
            raise serializers.ValidationError("Count needs to be a whole number of at least 1.")
        return value

    def validate_note(self, value):
        return value.strip()
