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

    def validate_email(self, value):
        """
        Validate that the email is unique within the same clinic.
        """
        if not value:
            return value  # Allow blank emails

        request = self.context.get("request")
        clinic = getattr(request.user, "clinic", None) if request else None
        if clinic is None:
            return value  # If no clinic context, skip validation

        qs = Owner.objects.filter(email=value, clinic=clinic)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                "This email is already registered for this clinic."
            )
        return value
