from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Invitation
from apps.clinics.models import ClinicGroup

User = get_user_model()


class MeEndpointTests(APITestCase):
    """`/api/v1/accounts/me/` — the caller's own profile."""

    def setUp(self):
        self.clinic = ClinicGroup.objects.create(name="Clinic A")
        self.vet = User.objects.create_user(
            username="vet_a",
            password="password123",
            email="vet_a@example.com",
            clinic=self.clinic,
            role="VET",
        )
        self.url = reverse("me")

    def test_requires_authentication(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_returns_own_profile(self):
        self.client.force_authenticate(user=self.vet)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.vet.id)
        self.assertEqual(response.data["email"], "vet_a@example.com")
        self.assertEqual(response.data["role"], "VET")
        self.assertEqual(response.data["clinic"], self.clinic.id)
        self.assertEqual(response.data["clinic_name"], "Clinic A")

    def test_is_read_only(self):
        """Role escalation must not be possible through your own profile."""
        self.client.force_authenticate(user=self.vet)
        response = self.client.patch(self.url, {"role": "ADMIN"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.vet.refresh_from_db()
        self.assertEqual(self.vet.role, "VET")

    def test_user_without_clinic(self):
        orphan = User.objects.create_user(
            username="orphan",
            password="password123",
            email="orphan@example.com",
            clinic=None,
            role="STAFF",
        )
        self.client.force_authenticate(user=orphan)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["clinic"])
        self.assertIsNone(response.data["clinic_name"])


class InvitationListTests(APITestCase):
    """`GET /api/v1/accounts/invitations/` — added so revoke is reachable."""

    def setUp(self):
        self.clinic_a = ClinicGroup.objects.create(name="Clinic A")
        self.clinic_b = ClinicGroup.objects.create(name="Clinic B")

        self.admin_a = User.objects.create_user(
            username="admin_a",
            password="password123",
            email="admin_a@example.com",
            clinic=self.clinic_a,
            role="ADMIN",
        )
        self.vet_a = User.objects.create_user(
            username="vet_a",
            password="password123",
            email="vet_a@example.com",
            clinic=self.clinic_a,
            role="VET",
        )
        self.admin_b = User.objects.create_user(
            username="admin_b",
            password="password123",
            email="admin_b@example.com",
            clinic=self.clinic_b,
            role="ADMIN",
        )

        self.invitation_a = Invitation.objects.create(
            email="pending@clinic-a.com",
            clinic=self.clinic_a,
            role="VET",
            invited_by=self.admin_a,
            expires_at=timezone.now() + timedelta(days=3),
        )
        self.expired_a = Invitation.objects.create(
            email="expired@clinic-a.com",
            clinic=self.clinic_a,
            role="STAFF",
            invited_by=self.admin_a,
            expires_at=timezone.now() - timedelta(days=1),
        )
        self.invitation_b = Invitation.objects.create(
            email="pending@clinic-b.com",
            clinic=self.clinic_b,
            role="VET",
            invited_by=self.admin_b,
            expires_at=timezone.now() + timedelta(days=3),
        )

        self.url = reverse("send-invitation")

    def test_admin_sees_only_own_clinic_invitations(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = {row["email"] for row in response.data["results"]}
        self.assertEqual(emails, {"pending@clinic-a.com", "expired@clinic-a.com"})

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(user=self.vet_a)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_token_is_never_exposed(self):
        """The whole point of withholding the token in the create response is
        lost if the list hands it out."""
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(self.url)

        for row in response.data["results"]:
            self.assertNotIn("token", row)

    def test_is_expired_flag(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(self.url, {"email__icontains": "expired"})

        self.assertEqual(len(response.data["results"]), 1)
        self.assertTrue(response.data["results"][0]["is_expired"])
        # Status stays "sent" in the database — the flag is what distinguishes them.
        self.assertEqual(response.data["results"][0]["status"], "sent")

    def test_pending_filter_excludes_lapsed_invitations(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(self.url, {"pending": "true"})

        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["email"], "pending@clinic-a.com")

    def test_status_filter(self):
        self.invitation_a.status = "revoked"
        self.invitation_a.save(update_fields=["status"])

        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(self.url, {"status": "revoked"})

        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["email"], "pending@clinic-a.com")

    def test_listing_does_not_consume_the_invite_send_quota(self):
        """`invite-send` is 20/day; browsing the list must not burn through it."""
        self.client.force_authenticate(user=self.admin_a)
        # Above the 20/day invite quota, below the 60/min generic user throttle.
        for _ in range(22):
            response = self.client.get(self.url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_post_still_creates_an_invitation(self):
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.post(
            self.url,
            {"email": "brand-new@clinic-a.com", "role": "VET"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("token", response.data)
        self.assertTrue(
            Invitation.objects.filter(
                email="brand-new@clinic-a.com", clinic=self.clinic_a
            ).exists()
        )

    def test_post_without_role_uses_the_model_default(self):
        """`role` is optional; omitting it used to raise KeyError (a 500)."""
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.post(
            self.url, {"email": "no-role@clinic-a.com"}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        invitation = Invitation.objects.get(email="no-role@clinic-a.com")
        self.assertEqual(invitation.role, "VET")
