from rest_framework import serializers
from .models import Owner


class OwnerSerializer(serializers.ModelSerializer):
    """Serializes pet owner data including contact info and registration date."""

    class Meta:
        model = Owner
        fields = [
            "id",
            "first_name",
            "last_name",
            "phone_number",
            "registration_date",
            "email",
            "address",
        ]
        read_only_fields = ["id", "registration_date"]
