from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Invitation


class ClinicScopedAdminMixin:
    """
    Restricts both the changelist queryset and any FK dropdown choices to
    the logged-in staff user's own clinic, mirroring the tenant isolation
    already enforced on the API side (see apps.accounts.permissions).
    Superusers are exempt, since they legitimately need to see/fix data
    across clinics.

    Subclasses set:
    - clinic_lookup: the ORM path from this model to clinics.ClinicGroup
      (e.g. "clinic", "owner__clinic", "pet__owner__clinic").
    - clinic_scoped_fk_fields (optional): {field_name: lookup} for FK
      fields on the add/change form whose choices should also be scoped
      (e.g. {"owner": "clinic"} on PetAdmin), otherwise a non-superuser
      admin could still pick a related object from another clinic even
      though the changelist itself is filtered.
    """

    clinic_lookup = "clinic"
    clinic_scoped_fk_fields = {}

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(**{self.clinic_lookup: request.user.clinic})

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if (
            not request.user.is_superuser
            and db_field.name in self.clinic_scoped_fk_fields
        ):
            lookup = self.clinic_scoped_fk_fields[db_field.name]
            kwargs["queryset"] = db_field.remote_field.model.objects.filter(
                **{lookup: request.user.clinic}
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(User)
class UserAdmin(ClinicScopedAdminMixin, BaseUserAdmin):
    """
    Extends Django's built-in UserAdmin so the password field is shown
    as a read-only hash + "change password" link, instead of a raw
    editable text field with the hash exposed. Also clinic-scoped so a
    non-superuser staff account can only see/edit users from its own
    clinic, instead of every user on the platform.
    """

    clinic_lookup = "clinic"

    # Add our custom fields (clinic, role) to the existing fieldsets
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Clinic info", {"fields": ("clinic", "role")}),
    )
    list_display = ("username", "email", "clinic", "role", "is_staff")
    list_filter = BaseUserAdmin.list_filter + ("clinic", "role")


@admin.register(Invitation)
class InvitationAdmin(ClinicScopedAdminMixin, admin.ModelAdmin):
    """Clinic-scoped so admins can't view or revoke invitations sent by
    other clinics."""

    clinic_lookup = "clinic"
    list_display = ("email", "clinic", "role", "status", "expires_at")
    list_filter = ("status", "role", "clinic")
    search_fields = ("email",)
