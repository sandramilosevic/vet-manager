from datetime import timedelta
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, transaction
from django.template.loader import render_to_string
from django.utils import timezone
from .models import Invitation, User


def send_invitation(email, clinic, role, invited_by):
    """Sends an invitation email to a new user, creating an Invitation object in the database.
    Raises ValueError if the invitation cannot be sent (e.g. duplicate, invalid role,
    or the inviter is not an admin).
    """
    if invited_by.role != "ADMIN":
        raise ValueError("Only admins can send invitations.")

    if clinic is None:
        raise ValueError("You must be assigned to a clinic to send invitations.")

    if Invitation.objects.filter(email=email, clinic=clinic, status="sent").exists():
        raise ValueError("An active invitation for this email already exists.")

    try:
        with transaction.atomic():
            invitation = Invitation.objects.create(
                email=email,
                clinic=clinic,
                role=role,
                invited_by=invited_by,
                expires_at=timezone.now() + timedelta(days=3),
            )

            _send_invitation_email(invitation)
    except IntegrityError:
        # Lost the race: another request created a "sent" invitation for
        # this email+clinic between our .exists() check and the DB write.
        raise ValueError("An active invitation for this email already exists.")

    return invitation


def accept_invitation(token, password):
    """
    Validates the token, creates a new user tied to the clinic,
    and marks the invitation as accepted.

    Every failure mode that isn't about password strength (bad token,
    expired, already used, or the invited email already having an
    account)
    """
    generic_error = "This invitation link is invalid or has expired."

    with transaction.atomic():
        # select_for_update locks the invitation row so two concurrent
        # requests with the same token can't both pass the validity check
        # and race to create two users / double-accept the invitation.
        try:
            invitation = (
                Invitation.objects.select_for_update()
                .select_related("clinic")
                .get(token=token)
            )
        except Invitation.DoesNotExist:
            raise ValueError(generic_error)

        if not invitation.is_valid():
            raise ValueError(generic_error)

        # Check if a user with this email already exists to prevent a
        # database IntegrityError -- but don't say so; use the same
        # generic error as an invalid/expired token (see docstring).
        if User.objects.filter(email=invitation.email).exists():
            raise ValueError(generic_error)

        # Run the same AUTH_PASSWORD_VALIDATORS used everywhere else in the project.
        unsaved_user = User(
            username=invitation.email, email=invitation.email, clinic=invitation.clinic
        )
        try:
            validate_password(password, user=unsaved_user)
        except ValidationError as e:
            raise ValueError(" ".join(e.messages))

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
    Falls back to plain text for email clients that do not support HTML.
    """
    link = f"{settings.FRONTEND_URL}/invite/{invitation.token}"

    context = {
        "clinic_name": invitation.clinic.name,
        "role": invitation.role,
        "link": link,
    }

    subject = f"You've been invited to join {invitation.clinic.name}"

    text_content = f"You have been invited to join {invitation.clinic.name} as {invitation.role}. Accept here: {link}"

    html_content = render_to_string("accounts/emails/invitation.html", context)

    email = EmailMultiAlternatives(
        subject,
        text_content,
        settings.DEFAULT_FROM_EMAIL,
        [invitation.email],
    )
    email.attach_alternative(html_content, "text/html")
    email.send()
