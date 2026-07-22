from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, "role", None) == "ADMIN"


class IsVetOrAdmin(BasePermission):
    """
    Restricts write access (create/update) on clinical data — e.g. medical
    records — to users who are actually qualified to author them. STAFF can
    still read (via get_queryset scoping + IsSameClinic), just not write.
    """

    def has_permission(self, request, view):
        return getattr(request.user, "role", None) in ("VET", "ADMIN")


def _resolve_object_clinic(obj):
    """
    Walk the FK chain to find the ClinicGroup a given object belongs to,
    no matter how many hops it takes (owner, pet__owner, etc).
    Returns None if no clinic can be resolved.
    """
    if hasattr(obj, "clinic_id"):
        return obj.clinic
    if hasattr(obj, "owner_id"):
        return _resolve_object_clinic(obj.owner)
    if hasattr(obj, "pet_id"):
        return _resolve_object_clinic(obj.pet)
    if hasattr(obj, "group_id"):  # e.g. Clinic -> ClinicGroup
        return obj.group
    return None


class IsSameClinic(BasePermission):
    """
    Object-level permission acting as a defense-in-depth backstop for
    multi-tenant isolation.

    get_queryset() filtering already scopes list/detail views to the
    caller's clinic, but that protection disappears the moment a view is
    refactored to use a different queryset or a custom get_object() method
    """

    message = "You do not have permission to access this resource."

    def has_object_permission(self, request, view, obj):
        user_clinic = getattr(request.user, "clinic", None)
        if user_clinic is None:
            return False
        return _resolve_object_clinic(obj) == user_clinic
