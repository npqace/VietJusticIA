
import pytest
from sqlalchemy.orm import Session
from app.database import models
from app.repository import user_repository
from app.model.userModel import SignUpModel

def test_update_user_status(db_session: Session, test_user: models.User):
    """Test updating user status via repository."""
    # Initial state
    assert test_user.is_active is True
    
    # Update to False
    updated_user = user_repository.update_user_status(db_session, test_user.id, False)
    assert updated_user is not None
    assert updated_user.id == test_user.id
    assert updated_user.is_active is False
    
    # Verify DB persistence
    db_session.refresh(test_user)
    assert test_user.is_active is False
    
    # Update back to True
    updated_user = user_repository.update_user_status(db_session, test_user.id, True)
    assert updated_user.is_active is True
    
def test_update_user_status_not_found(db_session: Session):
    """Test updating status for non-existent user."""
    result = user_repository.update_user_status(db_session, 99999, False)
    assert result is None
