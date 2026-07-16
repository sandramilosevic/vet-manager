import pytest
from django.core import mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from apps.accounts.models import User, Invitation
from apps.accounts.services import (
    send_invitation,
    accept_invitation,
    revoke_invitation,
    request_password_reset,
    confirm_password_reset,
)


class TestSendInvitation:
    """Tests for send_invitation: only admins can send invites, the
    inviter must belong to a clinic, and duplicate active ('sent')
    invitations for the same email+clinic are rejected."""

    def test_admin_can_send_invitation(self, admin_user, clinic_a):
        invitation = send_invitation(
            email="new@example.com", clinic=clinic_a, role="VET", invited_by=admin_user
        )
        assert invitation.status == "sent"
        assert invitation.email == "new@example.com"
        assert len(mail.outbox) == 1
        assert "new@example.com" in mail.outbox[0].to

    def test_non_admin_cannot_send_invitation(self, vet_user, clinic_a):
        with pytest.raises(ValueError, match="Only admins"):
            send_invitation(
                email="new@example.com",
                clinic=clinic_a,
                role="VET",
                invited_by=vet_user,
            )

    def test_inviter_without_clinic_raises(self, admin_user):
        admin_user.clinic = None
        with pytest.raises(ValueError, match="assigned to a clinic"):
            send_invitation(
                email="new@example.com", clinic=None, role="VET", invited_by=admin_user
            )

    def test_duplicate_active_invitation_rejected(
        self, admin_user, clinic_a, pending_invitation
    ):
        with pytest.raises(ValueError, match="already exists"):
            send_invitation(
                email=pending_invitation.email,
                clinic=clinic_a,
                role="VET",
                invited_by=admin_user,
            )

    def test_can_reinvite_after_previous_invitation_revoked(
        self, admin_user, clinic_a, pending_invitation
    ):
        # Only status="sent" blocks a new invite -- a revoked one shouldn't.
        pending_invitation.status = "revoked"
        pending_invitation.save()
        invitation = send_invitation(
            email=pending_invitation.email,
            clinic=clinic_a,
            role="VET",
            invited_by=admin_user,
        )
        assert invitation.status == "sent"


class TestAcceptInvitation:
    """Tests for accept_invitation: valid tokens create a user and mark
    the invitation accepted; every other failure mode (bad token,
    expired, already used, email already registered) returns the same
    generic error so an attacker can't distinguish between them."""

    def test_valid_token_creates_user(self, pending_invitation):
        user = accept_invitation(
            token=pending_invitation.token, password="StrongPass123!"
        )
        assert user.email == pending_invitation.email
        assert user.clinic_id == pending_invitation.clinic_id
        assert user.role == pending_invitation.role
        pending_invitation.refresh_from_db()
        assert pending_invitation.status == "accepted"

    @pytest.mark.django_db
    def test_invalid_token_raises_generic_error(self):
        with pytest.raises(ValueError, match="invalid or has expired"):
            accept_invitation(token="not-a-real-token", password="StrongPass123!")

    def test_expired_invitation_raises_generic_error(self, expired_invitation):
        with pytest.raises(ValueError, match="invalid or has expired"):
            accept_invitation(token=expired_invitation.token, password="StrongPass123!")

    def test_already_accepted_invitation_cannot_be_reused(self, pending_invitation):
        # First accept succeeds; the second attempt with the same token
        # must fail since the invitation is no longer "sent"/valid.
        accept_invitation(token=pending_invitation.token, password="StrongPass123!")
        with pytest.raises(ValueError, match="invalid or has expired"):
            accept_invitation(
                token=pending_invitation.token, password="AnotherPass123!"
            )

    def test_email_already_registered_raises_generic_error(
        self, pending_invitation, clinic_a
    ):
        # A user with this email already exists (e.g. created some other
        # way) -- accept_invitation must still fail generically, not with
        # a distinct "email taken" message that would leak account info.
        User.objects.create_user(
            username=pending_invitation.email,
            email=pending_invitation.email,
            password="Whatever123!",
            clinic=clinic_a,
            role="STAFF",
        )
        with pytest.raises(ValueError, match="invalid or has expired"):
            accept_invitation(token=pending_invitation.token, password="StrongPass123!")

    def test_weak_password_rejected(self, pending_invitation):
        # Passwords still go through AUTH_PASSWORD_VALIDATORS during accept.
        with pytest.raises(ValueError):
            accept_invitation(token=pending_invitation.token, password="123")


class TestRevokeInvitation:
    """Tests for revoke_invitation: only admins can revoke, only for
    their own clinic, and only invitations that are still pending."""

    def test_admin_can_revoke_pending_invitation(self, admin_user, pending_invitation):
        revoke_invitation(invitation_id=pending_invitation.id, requested_by=admin_user)
        pending_invitation.refresh_from_db()
        assert pending_invitation.status == "revoked"

    def test_non_admin_cannot_revoke(self, vet_user, pending_invitation):
        with pytest.raises(ValueError, match="Only admins"):
            revoke_invitation(
                invitation_id=pending_invitation.id, requested_by=vet_user
            )

    def test_cannot_revoke_invitation_from_other_clinic(
        self, other_clinic_admin, pending_invitation
    ):
        # Cross-tenant lookup should behave like the invitation doesn't
        # exist, not like a permission error -- avoids confirming that an
        # invitation with this id exists in someone else's clinic.
        with pytest.raises(ValueError, match="not found"):
            revoke_invitation(
                invitation_id=pending_invitation.id, requested_by=other_clinic_admin
            )

    def test_cannot_revoke_already_accepted_invitation(
        self, admin_user, pending_invitation
    ):
        pending_invitation.status = "accepted"
        pending_invitation.save()
        with pytest.raises(ValueError, match="pending invitations"):
            revoke_invitation(
                invitation_id=pending_invitation.id, requested_by=admin_user
            )


class TestPasswordReset:
    """Tests for request_password_reset / confirm_password_reset: a
    reset request never reveals whether the email exists, and the
    confirm step ties the token to the user's password hash so it
    can't be replayed once used."""

    def test_request_reset_for_existing_user_sends_email(self, admin_user):
        request_password_reset(admin_user.email)
        assert len(mail.outbox) == 1
        assert admin_user.email in mail.outbox[0].to

    @pytest.mark.django_db
    def test_request_reset_for_nonexistent_email_sends_nothing_and_does_not_raise(self):
        # No exception and no email -- the caller can't tell this apart
        # from "email exists but delivery is slow" by watching for errors.
        request_password_reset("nobody@example.com")
        assert len(mail.outbox) == 0

    def test_confirm_reset_with_valid_token_changes_password(self, admin_user):
        uid = urlsafe_base64_encode(force_bytes(admin_user.pk))
        token = default_token_generator.make_token(admin_user)
        confirm_password_reset(uid, token, "BrandNewPass123!")
        admin_user.refresh_from_db()
        assert admin_user.check_password("BrandNewPass123!")

    def test_confirm_reset_with_invalid_token_raises(self, admin_user):
        uid = urlsafe_base64_encode(force_bytes(admin_user.pk))
        with pytest.raises(ValueError, match="invalid or has expired"):
            confirm_password_reset(uid, "garbage-token", "BrandNewPass123!")

    def test_confirm_reset_with_bad_uid_raises(self):
        with pytest.raises(ValueError, match="invalid or has expired"):
            confirm_password_reset(
                "not-valid-base64!!!", "sometoken", "BrandNewPass123!"
            )

    def test_token_cannot_be_reused_after_password_changed(self, admin_user):
        # default_token_generator signs against the current password hash,
        # so changing the password once invalidates the token for reuse.
        uid = urlsafe_base64_encode(force_bytes(admin_user.pk))
        token = default_token_generator.make_token(admin_user)
        confirm_password_reset(uid, token, "FirstNewPass123!")
        with pytest.raises(ValueError, match="invalid or has expired"):
            confirm_password_reset(uid, token, "SecondNewPass123!")

    def test_confirm_reset_with_weak_password_raises(self, admin_user):
        uid = urlsafe_base64_encode(force_bytes(admin_user.pk))
        token = default_token_generator.make_token(admin_user)
        with pytest.raises(ValueError):
            confirm_password_reset(uid, token, "123")
