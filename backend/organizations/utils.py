from __future__ import annotations

from typing import Optional

from rest_framework.exceptions import PermissionDenied

from .models import Membership, Organization


def get_current_org(request) -> Organization:
    """Resolve current organization from header and user memberships."""
    if not request.user or not request.user.is_authenticated:
        raise PermissionDenied("Authentication required.")

    org_id = request.headers.get("X-Org-ID") or request.META.get("HTTP_X_ORG_ID")
    if not org_id:
        # fallback: if user has exactly one membership, use it to reduce UX friction
        memberships = Membership.objects.filter(user=request.user)
        if memberships.count() == 1:
            return memberships.first().organization
        raise PermissionDenied("X-Org-ID header is required.")

    try:
        membership = Membership.objects.select_related("organization").get(user=request.user, organization_id=org_id)
    except Membership.DoesNotExist as exc:
        raise PermissionDenied("User is not a member of this organization.") from exc

    return membership.organization
