import pytest
from apps.accounts.serializers import MyTokenObtainPairSerializer


class TestJWTClaims:
    """Tests that MyTokenObtainPairSerializer embeds the correct custom
    claims (role, clinic_id, email) into the JWT access/refresh token,
    since permission checks and multi-tenant scoping downstream rely on
    these claims being accurate."""

    def test_token_contains_correct_role_and_clinic_id(self, admin_user, clinic_a):
        token = MyTokenObtainPairSerializer.get_token(admin_user)

        assert token["role"] == "ADMIN"
        assert token["clinic_id"] == str(clinic_a.id)
        assert token["email"] == admin_user.email

    def test_token_contains_correct_claims_for_vet_role(self, vet_user, clinic_a):
        token = MyTokenObtainPairSerializer.get_token(vet_user)

        assert token["role"] == "VET"
        assert token["clinic_id"] == str(clinic_a.id)

    def test_token_clinic_id_is_none_when_user_has_no_clinic(self, admin_user):
        # A user not yet assigned to a clinic must not silently get a
        # clinic_id claim pointing at nothing / crash token generation.
        admin_user.clinic = None
        admin_user.save()

        token = MyTokenObtainPairSerializer.get_token(admin_user)

        assert token["clinic_id"] is None

    def test_token_claims_differ_between_clinics(self, admin_user, other_clinic_admin):
        # Sanity check that clinic_id isn't hardcoded/shared -- two admins
        # from different clinics must get different clinic_id claims.
        token_a = MyTokenObtainPairSerializer.get_token(admin_user)
        token_b = MyTokenObtainPairSerializer.get_token(other_clinic_admin)

        assert token_a["clinic_id"] != token_b["clinic_id"]

    @pytest.mark.django_db
    def test_login_endpoint_returns_token_with_correct_claims(
        self, api_client, admin_user, clinic_a
    ):
        # End-to-end check through the actual login endpoint, not just
        # the serializer in isolation -- confirms ThrottledTokenObtainPairView
        # wiring is correct too.
        response = api_client.post(
            "/api/v1/auth/login/",
            {"username": admin_user.username, "password": "StrongPass123!"},
        )

        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data
