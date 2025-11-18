from __future__ import annotations

from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import Membership


class IsOrgMemberWithRole(BasePermission):
    """
    Allows access to org members; write requires role!=viewer.
    Assumes get_current_org will already enforce membership.
    """

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        # membership check handled in view get_queryset via get_current_org
        if request.method in SAFE_METHODS:
            return True
        return Membership.objects.filter(user=request.user, organization__memberships__user=request.user).exclude(
            role=Membership.ROLE_VIEWER
        ).exists()
