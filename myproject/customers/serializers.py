from rest_framework import serializers

from .models import Customer


class CustomerSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone_number',
            'company',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_email(self, value):
        return value.strip().lower()

    def validate_phone_number(self, value):
        if value in (None, ''):
            return value
        digits = [character for character in value if character.isdigit()]
        if len(digits) < 7:
            raise serializers.ValidationError(
                'Enter a phone number with at least 7 digits.'
            )
        return value
