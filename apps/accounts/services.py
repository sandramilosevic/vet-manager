from django.utils import timezone
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from datetime import timedelta
from .models import Invitation, User


def send_invitation(email, clinic, role, invited_by):
    """
    Creates a new invitation and sends an email to the invited user.
    Raises ValueError if the caller lacks permission or an active invitation already exists.
    """
    if invited_by.role != "ADMIN":
        raise ValueError("Only admins can send invitations.")

    # Prevent duplicate active invitations for the same email + clinic combo.
    # Does NOT block re-inviting after expiry or revocation.
    if Invitation.objects.filter(email=email, clinic=clinic, status="sent").exists():
        raise ValueError("An active invitation for this email already exists.")

    invitation = Invitation.objects.create(
        email=email,
        clinic=clinic,
        role=role,
        invited_by=invited_by,
        expires_at=timezone.now() + timedelta(days=3),
    )

    _send_invitation_email(invitation)
    return invitation


def accept_invitation(token, password):
    """
    Validates the token, creates a new user tied to the clinic,
    and marks the invitation as accepted.
    Raises ValueError if the token is invalid or the invitation has expired/been used.
    """

    try:
        invitation = Invitation.objects.select_related("clinic").get(token=token)

    except Invitation.DoesNotExist:
        raise ValueError("Invalid token.")

    if not invitation.is_valid():
        raise ValueError("Invitation has expired or has already been used.")

    user = User.objects.create_user(
        username=invitation.email,
        email=invitation.email,
        password=password,
        clinic=invitation.clinic,
        role=invitation.role,
    )

    invitation.status = "accepted"
    invitation.save(update_fields=["status", "updated_at"])

    return user


def revoke_invitation(invitation_id, requested_by):
    """
    Marks an invitation as revoked.
    Only ADMINs belonging to the same clinic can revoke invitations.
    Raises ValueError if the invitation is not found or already used/expired.
    """

    if requested_by.role != "ADMIN":
        raise ValueError("Only admins can revoke invitations.")

    try:
        # Scoped to the admin's clinic, prevents cross-clinic revocation
        invitation = Invitation.objects.get(
            id=invitation_id, clinic=requested_by.clinic
        )
    except Invitation.DoesNotExist:
        raise ValueError("Invitation not found.")

    if invitation.status != "sent":
        raise ValueError("Only pending invitations can be revoked.")

    invitation.status = "revoked"
    invitation.save(update_fields=["status", "updated_at"])
    return invitation


def _send_invitation_email(invitation):
    """
    Sends an HTML invitation email with a unique token link.
    Falls back to plain text for email clients that don't support HTML.
    """

    link = f"{settings.FRONTEND_URL}/invite/{invitation.token}"

    context = {
        "clinic_name": invitation.clinic.name,
        "role": invitation.role,
        "link": link,
    }

    subject = f"You've been invited to join {invitation.clinic.name}"

    # Plain text fallback for email clients that don't support HTML
    text_content = f"You have been invited to join {invitation.clinic.name} as {invitation.role}. Accept here: {link}"

    html_content = render_to_string("accounts/emails/invitation.html", context)

    email = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,  # sender - configured in settings
        [invitation.email],  # recipient - set dynamically by admin
    )
    email.attach_alternative(html_content, "text/html")
    email.send()
