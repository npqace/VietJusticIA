
import pytest
from unittest.mock import Mock, MagicMock
from sqlalchemy.orm import Session
from app.repository import user_repository
from app.database import models
from app.model.userModel import SignUpModel
from fastapi import HTTPException
from sqlalchemy import func

def test_create_user_case_insensitive_email_check():
    db = Mock(spec=Session)
    user_input = SignUpModel(
        full_name="Test User",
        email="Test@Example.com", # Mixed case
        phone="0123456789",
        pwd="Password123!",
        confirm_pwd="Password123!"
    )
    
    # Mock existing user with lowercase email
    existing_user = models.User(email="test@example.com")
    
    # Mock query chain: db.query(models.User).filter(func.lower(...)).first()
    query_mock = Mock()
    filter_mock = Mock()
    
    db.query.return_value = query_mock
    query_mock.filter.return_value = filter_mock
    filter_mock.first.return_value = existing_user # Return existing user
    
    with pytest.raises(HTTPException) as exc:
        user_repository.create_user(db, user_input)
        
    assert exc.value.status_code == 400
    assert exc.value.detail == "Email already registered"

def test_authenticate_user_case_insensitive():
    db = Mock(spec=Session)
    identifier = "User@Example.com"
    password = "Password123!"
    
    db_user = models.User(
        email="user@example.com",
        hashed_password="hashed_password",
        is_active=True
    )
    
    # Mock security verify_password
    with pytest.MonkeyPatch.context() as m:
        m.setattr("app.repository.user_repository.verify_password", lambda p, h: True)
        
        # Mock query for email match
        # First query (by email) returns user
        query_mock = Mock()
        filter_mock = Mock()
        db.query.return_value = query_mock
        query_mock.filter.return_value = filter_mock
        filter_mock.first.return_value = db_user
        
        result = user_repository.authenticate_user(db, identifier, password)
        assert result == db_user

def test_get_user_by_email_case_insensitive():
    db = Mock(spec=Session)
    email = "MixedCase@Example.com"
    
    # Mock query chain
    query_mock = Mock()
    filter_mock = Mock()
    db.query.return_value = query_mock
    query_mock.filter.return_value = filter_mock
    filter_mock.first.return_value = models.User(email="mixedcase@example.com")
    
    result = user_repository.get_user_by_email(db, email)
    assert result is not None
    assert result.email == "mixedcase@example.com"
