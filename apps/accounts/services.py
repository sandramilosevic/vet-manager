from datetime import timedelta
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, transaction
from django.template.loader import render_to_string
from django.utils import timezone
from .models import Invitation, User
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode


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


def request_password_reset(email):
    """
    Sends a password reset email if a user with this email exists.

    Always returns silently (no exception, no return value) whether or
    not the email matches a user. This is intentional: raising a
    different error for "not found" vs "found and email sent" would let
    an attacker enumerate registered emails by watching the response.
    The view always returns the same message regardless of what happens
    here.
    """
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return

    # uid is not secret, it just tells the confirm step which user this
    # is for. All the actual security comes from the token below, which
    # is signed with SECRET_KEY and tied to the user's current password
    # hash (see confirm_password_reset for why that matters).
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    link = f"{settings.FRONTEND_URL}/reset-password/{uid}/{token}"

    subject = "Reset your Vet Manager password"
    text_content = f"Reset your password here: {link}"
    html_content = render_to_string(
        "accounts/emails/password_reset.html", {"link": link}
    )

    email_msg = EmailMultiAlternatives(
        subject, text_content, settings.DEFAULT_FROM_EMAIL, [user.email]
    )

    email_msg.attach_alternative(html_content, "text/html")
    email_msg.send()


def confirm_password_reset(uidb64, token, new_password):
    """
    Validates the uid/token pair and sets the new password.

    Raises ValueError with the same generic message for every failure
    mode (bad uid, unknown user, invalid/expired token) so the caller
    can't distinguish "this token never existed" from "this token
    expired" -- same reasoning as accept_invitation's generic_error.
    """
    generic_error = "This password reset link is invalid or has expired."

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValueError(generic_error)

    # default_token_generator ties the token to the user's current
    # password hash + last_login, so this check also fails automatically
    # once the token has already been used once (since set_password()
    # below changes the hash the token was signed against).
    if not default_token_generator.check_token(user, token):
        raise ValueError(generic_error)

    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        # .messages (plural) is the list of error strings on
        # ValidationError -- .message (singular) doesn't exist here and
        # would raise AttributeError instead of returning a useful
        # message to the user.
        raise ValueError(" ".join(e.messages))

    # set_password() hashes the password (PBKDF2 by default). Never
    # assign to user.password directly -- that stores it as plaintext.
    user.set_password(new_password)
    user.save(update_fields=["password"])
    return user
