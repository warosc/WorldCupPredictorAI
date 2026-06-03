"""
RBAC: Role-Based Access Control.
Roles: viewer (read-only) < analyst (can trigger predictions) < admin (full access).
"""
from fastapi import Depends, HTTPException, status

from app.auth.jwt import get_current_user

ROLE_HIERARCHY = {"viewer": 0, "analyst": 1, "admin": 2}


def require_role(minimum_role: str):
    """Dependency factory — use as: Depends(require_role("analyst"))"""
    def _check(user: dict = Depends(get_current_user)) -> dict:
        user_level = ROLE_HIERARCHY.get(user.get("role", "viewer"), 0)
        required_level = ROLE_HIERARCHY.get(minimum_role, 0)
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{minimum_role}' or higher required.",
            )
        return user
    return _check


# Convenience aliases
require_analyst = require_role("analyst")
require_admin = require_role("admin")
