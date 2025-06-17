from fastapi import FastAPI, HTTPException, status, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from .database import models
from .model.userModel import SignUpModel, LoginModel, UserResponse
from .services.auth import create_access_token, verify_token
from .database.database import get_db
from .database.create_tables import create_tables
from .repository import user_repository

# Create tables
create_tables()

app = FastAPI(title="LawSphere API", version="1.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API key header for authentication
api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

@app.post("/signup", response_model=dict)
async def signup(signup_request: SignUpModel, db: Session = Depends(get_db)):
    # Check if passwords match
    if signup_request.pwd != signup_request.confirm_pwd:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Create user in database
    user = user_repository.create_user(db, signup_request)
    
    # Generate JWT token
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/login", response_model=dict)
async def login(login_request: LoginModel, db: Session = Depends(get_db)):
    user = user_repository.authenticate_user(
        db, login_request.identifier, login_request.pwd
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email/phone or password"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(authorization: str = Security(api_key_header), db: Session = Depends(get_db)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(models.User).filter(models.User.email == payload.get("sub")).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user

@app.get("/protected")
async def protected_route(current_user = Depends(get_current_user)):
    return {"message": f"Hello {current_user.full_name}, this is a protected route"}

@app.get("/me", response_model=UserResponse)
async def read_users_me(current_user = Depends(get_current_user)):
    return current_user