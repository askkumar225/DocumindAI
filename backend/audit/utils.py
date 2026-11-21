"""
Audit log helper utilities — Day 6.

Usage anywhere in the codebase:

    from audit.utils import log_action
    from audit.models import AuditLog

    log_action(
        user=request.user,
        action=AuditLog.DOCUMENT_APPROVED,
        document=document,
        description="Manager approved contract.",
        request=request,         # optional — extracts IP
        extra_data={"comments": "Looks good"},
    )

All errors are caught and logged so a failing audit write never breaks
the main request/task flow.
"""

import logging

logger = logging.getLogger(__name__)


def log_action(
    user,
    action: str,
    document=None,
    description: str = "",
    request=None,
    extra_data: dict | None = None,
) -> None:
    """
    Create an AuditLog record.

    Args:
        user:        The user performing the action (may be None for system actions).
        action:      One of the AuditLog action constants (e.g. AuditLog.DOCUMENT_APPROVED).
        document:    Optional related Document instance.
        description: Human-readable description of the event.
        request:     Optional DRF/Django request — used to extract the client IP address.
        extra_data:  Optional dict with additional structured context.
    """
    from audit.models import AuditLog  # deferred to avoid circular imports at startup

    try:
        ip = _get_client_ip(request) if request else None

        AuditLog.objects.create(
            user=user,
            action=action,
            document=document,
            description=description,
            extra_data=extra_data or {},
            ip_address=ip,
        )

        logger.debug(
            "AuditLog created: user=%s action=%s document=%s",
            getattr(user, "username", "system"),
            action,
            getattr(document, "id", None),
        )

    except Exception as exc:
        # Never let an audit failure propagate — log and continue
        logger.error(
            "Failed to create AuditLog (action=%s user=%s): %s",
            action,
            getattr(user, "username", "unknown"),
            exc,
        )


def _get_client_ip(request) -> str | None:
    """
    Extract the real client IP from the request.

    Checks X-Forwarded-For first (for reverse-proxy setups), then
    falls back to REMOTE_ADDR.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        # X-Forwarded-For can be a comma-separated list; first entry is the client
        ip = x_forwarded_for.split(",")[0].strip()
        return ip or None
    return request.META.get("REMOTE_ADDR") or None
