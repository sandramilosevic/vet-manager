from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Invitation


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Extends Django's built-in UserAdmin so the password field is shown
    as a read-only hash + "change password" link
    """

    # Add our custom fields (clinic, role) to the existing fieldsets
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Clinic info", {"fields": ("clinic", "role")}),
    )
    list_display = ("username", "email", "clinic", "role", "is_staff")
    list_filter = BaseUserAdmin.list_filter + ("clinic", "role")


admin.site.register(Invitation)
