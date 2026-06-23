from rest_framework import serializers
from .models import ClinicGroup, Clinic, WorkingHours


class ClinicGroupSerializer(serializers.ModelSerializer):
    """Serializes clinic group data."""

    class Meta:
        model = ClinicGroup
        fields = ["id", "name"]
        read_only_fields = ["id"]


class ClinicSerializer(serializers.ModelSerializer):
    """Serializes individual clinic data including contact info."""

    class Meta:
        model = Clinic
        fields = ["id", "group", "name", "address", "city", "phone_number", "email"]
        read_only_fields = ["id"]


class WorkingHoursSerializer(serializers.ModelSerializer):
    """Serializes working hours per weekday for a clinic."""

    class Meta:
        model = WorkingHours
        fields = ["id", "clinic", "weekday", "start_time", "end_time"]
        read_only_fields = ["id"]
