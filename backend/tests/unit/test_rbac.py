import pytest
from fastapi import HTTPException, status
from unittest.mock import Mock
from app.core.rbac import verify_admin, verify_lawyer, verify_role
from app.database.models import User

def test_verify_admin_success():
    user = Mock(spec=User)
    user.role = User.Role.ADMIN
    assert verify_admin(user) == user

def test_verify_admin_failure():
    user = Mock(spec=User)
    user.role = User.Role.USER
    with pytest.raises(HTTPException) as exc:
        verify_admin(user)
    assert exc.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc.value.detail == "Admin access required"

def test_verify_lawyer_success():
    user = Mock(spec=User)
    user.role = User.Role.LAWYER
    assert verify_lawyer(user) == user

def test_verify_lawyer_failure():
    user = Mock(spec=User)
    user.role = User.Role.USER
    with pytest.raises(HTTPException) as exc:
        verify_lawyer(user)
    assert exc.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc.value.detail == "Lawyer access required"

def test_verify_role_success():
    user = Mock(spec=User)
    user.role = User.Role.ADMIN
    checker = verify_role([User.Role.ADMIN, User.Role.LAWYER])
    assert checker(user) == user

def test_verify_role_failure():
    user = Mock(spec=User)
    user.role = User.Role.USER
    checker = verify_role([User.Role.ADMIN, User.Role.LAWYER])
    with pytest.raises(HTTPException) as exc:
        checker(user)
    assert exc.value.status_code == status.HTTP_403_FORBIDDEN
    assert "Access forbidden" in exc.value.detail
