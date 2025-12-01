"""
Admin-only endpoints for managing users, lawyers, and viewing statistics.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, case
from typing import List
import logging

from ..database.database import get_db
from ..database.models import User, Lawyer, ServiceRequest
from ..services.auth import get_current_user
from ..services.audit_service import audit_service
from ..schemas.user import UserProfile, AdminCreateUser, AdminCreateUserResponse, UserListResponse
from ..repository import lawyer_repository, user_repository, document_cms_repository
from ..core.security import get_password_hash
from ..utils.security_utils import generate_secure_password

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


from ..core.rbac import verify_admin


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for admin."""
    try:
        logger.info(f"Admin {current_user.email} fetching dashboard stats")

        stats = db.query(
            func.count(case((User.role == User.Role.USER, User.id))).label('total_users'),
            func.count(case((User.role == User.Role.ADMIN, User.id))).label('total_admins'),
            func.count(Lawyer.id).label('total_lawyers'),
            func.count(ServiceRequest.id).label('total_requests')
        ).first()

        total_documents = document_cms_repository.get_total_documents_count()

        result = {
            "total_users": stats.total_users,
            "total_lawyers": stats.total_lawyers,
            "total_admins": stats.total_admins,
            "total_requests": stats.total_requests,
            "total_documents": total_documents
        }

        logger.info(f"Dashboard stats retrieved: {result}")
        return result

    except Exception as e:
        logger.error(f"Failed to fetch dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve dashboard statistics"
        )


@router.get("/users", response_model=UserListResponse)
async def get_all_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role: Optional[str] = None,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get all users (admin only) with pagination and filtering."""
    try:
        logger.info(f"Admin {current_user.email} fetching users (skip={skip}, limit={limit}, search={search}, role={role})")

        users = user_repository.get_all_users(db, skip=skip, limit=limit, search=search, role=role)
        
        # Calculate total for pagination
        query = db.query(func.count(User.id))
        if role and role.lower() != 'all':
            try:
                role_enum = User.Role(role.lower())
                query = query.filter(User.role == role_enum)
            except ValueError:
                pass
        
        if search:
            search_lower = f"%{search.lower()}%"
            query = query.filter(
                (func.lower(User.full_name).like(search_lower)) |
                (func.lower(User.email).like(search_lower)) |
                (User.phone.like(search_lower))
            )
            
        total = query.scalar()
        
        logger.info(f"Retrieved {len(users)} users (total: {total})")

        return {
            "users": users, 
            "total": total, 
            "skip": skip, 
            "limit": limit
        }

    except Exception as e:
        logger.error(f"Failed to fetch users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: int,
    is_active: bool,
    request: Request,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Activate or deactivate a user account."""
    try:
        logger.info(f"Admin {current_user.email} updating status for user {user_id} to {is_active}")

        # Check if user exists
        user = user_repository.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Prevent admin from deactivating themselves
        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )

        # Update status via repository
        updated_user = user_repository.update_user_status(db, user_id, is_active)
        
        # Audit Log
        audit_service.log_action(
            db=db,
            admin_id=current_user.id,
            action="UPDATE_USER_STATUS",
            target_type="USER",
            target_id=str(user_id),
            details=f"Status changed to {'Active' if is_active else 'Inactive'}",
            request=request
        )

        logger.info(f"User {user_id} status updated successfully")
        return {"message": "User status updated successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update user status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user status"
        )


@router.get("/requests")
async def get_all_service_requests(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get all service requests (admin only)."""
    try:
        logger.info(f"Admin {current_user.email} fetching all service requests")

        # Get all service requests with user and lawyer info
        requests = db.query(ServiceRequest).options(
            joinedload(ServiceRequest.user),
            joinedload(ServiceRequest.lawyer).joinedload(Lawyer.user)
        ).order_by(
            ServiceRequest.created_at.desc()
        ).offset(skip).limit(limit).all()

        # Transform to response format
        request_list = []
        for req in requests:
            request_item = {
                "id": req.id,
                "user_id": req.user_id,
                "user_name": req.user.full_name if req.user else "Unknown User",
                "lawyer_id": req.lawyer_id,
                "lawyer_name": req.lawyer.user.full_name if req.lawyer and req.lawyer.user else None,
                "title": req.title,
                "description": req.description,
                "status": req.status.value,
                "created_at": req.created_at,
                "updated_at": req.updated_at
            }
            request_list.append(request_item)

        logger.info(f"Retrieved {len(request_list)} service requests")
        return request_list

    except Exception as e:
        logger.error(f"Failed to fetch service requests: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve service requests"
        )


@router.post("/users/create", response_model=AdminCreateUserResponse)
async def create_user_account(
    user_data: AdminCreateUser,
    request: Request,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Create a new user account (admin only). Can create lawyers or admins only."""
    try:
        logger.info(f"Admin {current_user.email} creating new {user_data.role} account: {user_data.email}")

        # Validate role - only lawyer and admin allowed
        valid_roles = [User.Role.LAWYER.value, User.Role.ADMIN.value]
        if user_data.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Admins can only create 'lawyer' or 'admin' accounts."
            )

        # If role is lawyer, lawyer_profile is required
        if user_data.role == User.Role.LAWYER.value and not user_data.lawyer_profile:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lawyer profile data is required when creating a lawyer account"
            )

        # Check if email already exists
        existing_user_email = user_repository.get_user_by_email(db, user_data.email)
        if existing_user_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Check if phone already exists
        existing_user_phone = user_repository.get_user_by_phone(db, user_data.phone)
        if existing_user_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Phone number already registered"
            )

        # If lawyer, check if bar license number already exists
        if user_data.role == User.Role.LAWYER.value:
            existing_lawyer = db.query(Lawyer).filter(
                Lawyer.bar_license_number == user_data.lawyer_profile.bar_license_number
            ).first()
            if existing_lawyer:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bar license number already registered"
                )

        # Generate secure random password
        generated_password = generate_secure_password()

        # Create user account
        try:
            role_enum = User.Role(user_data.role)
        except ValueError:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role provided"
            )

        hashed_password = get_password_hash(generated_password)
        new_user = User(
            full_name=user_data.full_name,
            email=user_data.email,
            phone=user_data.phone,
            hashed_password=hashed_password,
            role=role_enum,
            is_verified=True,  # Admin-created accounts are pre-verified
            is_active=True
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # If lawyer, create lawyer profile
        if user_data.role == User.Role.LAWYER.value:
            lawyer_profile = Lawyer(
                user_id=new_user.id,
                specialization=user_data.lawyer_profile.specialization,
                bar_license_number=user_data.lawyer_profile.bar_license_number,
                years_of_experience=user_data.lawyer_profile.years_of_experience,
                city=user_data.lawyer_profile.city,
                province=user_data.lawyer_profile.province,
                bio=user_data.lawyer_profile.bio,
                consultation_fee=user_data.lawyer_profile.consultation_fee,
                languages=user_data.lawyer_profile.languages,
                verification_status=Lawyer.VerificationStatus.APPROVED,  # Pre-approved by admin
                is_available=True
            )
            db.add(lawyer_profile)
            db.commit()
            db.refresh(lawyer_profile)
            logger.info(f"Lawyer profile created for user {new_user.id}")

        # Audit Log
        audit_service.log_action(
            db=db,
            admin_id=current_user.id,
            action="CREATE_USER",
            target_type="USER",
            target_id=str(new_user.id),
            details=f"Created {user_data.role} account: {user_data.email}",
            request=request
        )

        logger.info(f"User account created successfully: {new_user.id} ({user_data.role})")

        # Return user info with generated password
        return AdminCreateUserResponse(
            user=new_user,
            generated_password=generated_password
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create user account: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )



