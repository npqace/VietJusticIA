"""
Role-Based Access Control (RBAC) module.
Centralizes all permission logic and dependencies.
"""
from fastapi import Depends, HTTPException, status
from typing import List, Callable

from ..database.models import User
from ..services.auth import get_current_user

def verify_role(allowed_roles: List[User.Role]) -> Callable:
    """
    Factory function to create a dependency that checks if the user has one of the allowed roles.
    
    Args:
        allowed_roles: List of User.Role enums that are allowed access.
        
    Returns:
        Dependency function that returns the current user if authorized.
    """
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Requires one of roles {[r.value for r in allowed_roles]}"
            )
        return current_user
    
    return role_checker

def verify_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to verify user is an admin.
    """
    if current_user.role != User.Role.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

def verify_lawyer(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to verify user is a lawyer.
    """
    if current_user.role != User.Role.LAWYER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lawyer access required"
        )
    return current_user
