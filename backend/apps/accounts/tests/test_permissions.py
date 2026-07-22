import pytest
from unittest.mock import Mock
from apps.accounts.permissions import IsAdmin, IsVetOrAdmin, IsSameClinic


class TestIsAdmin:
    """Tests for the IsAdmin permission, which only grants access to
    users whose role is 'ADMIN'."""

    def test_admin_has_permission(self, admin_user):
        request = Mock(user=admin_user)
        assert IsAdmin().has_permission(request, None) is True

    def test_vet_does_not_have_permission(self, vet_user):
        request = Mock(user=vet_user)
        assert IsAdmin().has_permission(request, None) is False

    def test_user_without_role_attribute(self):
        request = Mock(user=Mock(spec=[]))
        assert IsAdmin().has_permission(request, None) is False


class TestIsVetOrAdmin:
    """Tests for the IsVetOrAdmin permission, which grants write access
    to users with role 'VET' or 'ADMIN', but not 'STAFF'."""

    def test_admin_has_permission(self, admin_user):
        request = Mock(user=admin_user)
        assert IsVetOrAdmin().has_permission(request, None) is True

    def test_vet_has_permission(self, vet_user):
        request = Mock(user=vet_user)
        assert IsVetOrAdmin().has_permission(request, None) is True

    def test_staff_does_not_have_permission(self, staff_user):
        request = Mock(user=staff_user)
        assert IsVetOrAdmin().has_permission(request, None) is False


class TestIsSameClinic:
    """Tests for the IsSameClinic object-level permission, which walks
    the FK chain (clinic_id / owner_id / pet_id / group_id) to confirm
    that an object belongs to the requesting user's clinic."""

    def test_same_clinic_object_allowed(self, admin_user, clinic_a):
        obj = Mock(spec=["clinic_id", "clinic"])
        obj.clinic = clinic_a
        request = Mock(user=admin_user)
        assert IsSameClinic().has_object_permission(request, None, obj) is True

    def test_user_without_clinic_denied(self, clinic_a):
        user = Mock(clinic=None)
        obj = Mock(spec=["clinic_id", "clinic"])
        obj.clinic = clinic_a
        request = Mock(user=user)
        assert IsSameClinic().has_object_permission(request, None, obj) is False

    def test_resolves_clinic_through_pet_owner_fk_chain(self, admin_user, clinic_a):
        # Simulates a MedicalRecord: has `pet_id` -> pet.owner.clinic
        owner = Mock(spec=["clinic_id", "clinic"])
        owner.clinic = clinic_a
        pet = Mock(spec=["owner_id", "owner"])
        pet.owner = owner
        record = Mock(spec=["pet_id", "pet"])
        record.pet = pet
        request = Mock(user=admin_user)
        assert IsSameClinic().has_object_permission(request, None, record) is True

    def test_unresolvable_clinic_denied(self, admin_user):
        obj = Mock(spec=[])  # no clinic_id, owner_id, pet_id, or group_id
        request = Mock(user=admin_user)
        assert IsSameClinic().has_object_permission(request, None, obj) is False
