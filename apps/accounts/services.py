from datetime import timedelta
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.db import transaction, IntegrityError
from django.template.loader import render_to_string
from django.utils import timezone
from .models import Invitation, User


def send_invitation(email, clinic, role, invited_by):
    """
    Creates a new invitation and sends an email to the invited user.
    Raises ValueError if the caller lacks permission or an active invitation already exists.
    """
    if invited_by.role != "ADMIN":
        raise ValueError("Only admins can send invitations.")

    if clinic is None:
        raise ValueError("You must be assigned to a clinic to send invitations.")

    # Prevent duplicate active invitations for the same email and clinic combination.
    # This does not block re-inviting after expiration or revocation.
    if Invitation.objects.filter(email=email, clinic=clinic, status="sent").exists():
        raise ValueError("An active invitation for this email already exists.")

    # Use an atomic transaction to ensure the database rolls back if the email delivery fails.
    with transaction.atomic():
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
    Accepts an invitation using a token and sets the user's password.
    Raises ValueError if the token is invalid, expired, or already used.
    """
    with transaction.atomic():
        # select_for_update() locks this invitation row for the duration of the
        # transaction. A second concurrent request with the same token will block
        # here until the first request commits (or rolls back), then re-read the
        # row and see status="accepted" -> clean ValueError instead of a race.
        try:
            invitation = (
                Invitation.objects.select_for_update()
                .select_related("clinic")
                .get(token=token)
            )
        except Invitation.DoesNotExist:
            raise ValueError("Invalid token.")

        if not invitation.is_valid():
            raise ValueError("Invitation has expired or has already been used.")

        # Check if a user with this email already exists to prevent a database IntegrityError.
        if User.objects.filter(email=invitation.email).exists():
            raise ValueError("A user with this email address already exists.")

        # Run the same AUTH_PASSWORD_VALIDATORS used everywhere else in the project.
        unsaved_user = User(
            username=invitation.email, email=invitation.email, clinic=invitation.clinic
        )
        try:
            validate_password(password, user=unsaved_user)
        except ValidationError as e:
            raise ValueError(" ".join(e.messages))

        # Create the new user and mark the invitation as accepted.
        # The select_for_update() lock above means we're the only request that
        # can reach this point for this token, but we still guard against the
        # (separate) case of the email colliding with an unrelated user created
        # in between our exists() check and now.
        try:
            user = User.objects.create_user(
                username=invitation.email,
                email=invitation.email,
                password=password,
                clinic=invitation.clinic,
                role=invitation.role,
            )
        except IntegrityError:
            raise ValueError("A user with this email address already exists.")

        # Mark the invitation as accepted to prevent reuse.
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

    with transaction.atomic():
        try:
            # Scoped to the admin's clinic to prevent cross-clinic revocation.
            # Locked so it can't race with a concurrent accept_invitation() call.
            invitation = Invitation.objects.select_for_update().get(
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
