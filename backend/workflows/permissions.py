"""
Custom DRF permission classes for DocuMind AI — Day 6.

Security principle:
    The backend — not the frontend — decides whether a user has permission.
    Every view that touches sensitive data must apply at least one of these
    classes. Inactive users are always denied regardless of role.

Classes:
    IsAdmin                  — user.role == ADMIN
    IsManagerOrAdmin         — user.role in {MANAGER, ADMIN}
    IsEmployee               — any authenticated, active user (all roles qualify)
    DocumentPermission       — object-level: checks DocumentPermission table
    CanApproveDocument       — object-level: user can_approve the document
"""

from rest_framework.permissions import BasePermission

from workflows.models import DocumentPermission as DocumentPermissionModel


# ─── Role-level permission classes ────────────────────────────────────────────

class IsAdmin(BasePermission):
    """
    Allow access only to ADMIN users.

    Used for:
        - User management
        - Full audit log access
        - System-wide permission management
    """

    message = "Access restricted to administrators."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and getattr(request.user, "role", None) == "ADMIN"
        )


class IsManagerOrAdmin(BasePermission):
    """
    Allow access to MANAGER or ADMIN users.

    Used for:
        - Approve / reject documents
        - View AI risk analysis
        - View audit history for documents
    """

    message = "Access restricted to managers and administrators."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and getattr(request.user, "role", None) in ("MANAGER", "ADMIN")
        )


class IsEmployee(BasePermission):
    """
    Allow access to any active, authenticated user (EMPLOYEE, MANAGER, ADMIN).

    This is effectively IsAuthenticated + is_active check.
    Use it as a base guard on employee-facing endpoints.
    """

    message = "Authentication required."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )


# ─── Object-level permission classes ──────────────────────────────────────────

class DocumentAccessPermission(BasePermission):
    """
    Object-level permission: checks whether the requesting user has access
    to a specific Document.

    Access is granted when ANY of the following is true:
        1. User is ADMIN                          (full access to everything)
        2. User owns the document                 (uploaded_by == request.user)
        3. A DocumentPermission row exists granting this user can_view
        4. A DocumentPermission row exists granting this user's role can_view

    This permission must be used together with IsAuthenticated (or IsEmployee)
    as a view-level guard. Apply it via get_object() or check_object_permissions().
    """

    message = "You do not have permission to access this document."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated or not user.is_active:
            return False

        # 1 — Admins always have access
        if getattr(user, "role", None) == "ADMIN":
            return True

        # 2 — Document owner always has access
        if obj.uploaded_by_id == user.pk:
            return True

        # 3 — Explicit user-level permission
        if DocumentPermissionModel.objects.filter(
            document=obj,
            user=user,
            can_view=True,
        ).exists():
            return True

        # 4 — Role-level permission
        user_role = getattr(user, "role", "")
        if user_role and DocumentPermissionModel.objects.filter(
            document=obj,
            role=user_role,
            can_view=True,
        ).exists():
            return True

        return False


class CanApproveDocument(BasePermission):
    """
    Object-level permission: checks whether the requesting user can approve
    a specific Document.

    Approval access is granted when ANY of the following is true:
        1. User is ADMIN
        2. User has an explicit DocumentPermission with can_approve=True
        3. User's role has a DocumentPermission with can_approve=True
    """

    message = "You do not have permission to approve this document."

    def has_object_permission(self, request, view, obj):
        user = request.user

        if not user or not user.is_authenticated or not user.is_active:
            return False

        if getattr(user, "role", None) == "ADMIN":
            return True

        if DocumentPermissionModel.objects.filter(
            document=obj,
            user=user,
            can_approve=True,
        ).exists():
            return True

        user_role = getattr(user, "role", "")
        if user_role and DocumentPermissionModel.objects.filter(
            document=obj,
            role=user_role,
            can_approve=True,
        ).exists():
            return True

        return False
