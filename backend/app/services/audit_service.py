
import logging
from sqlalchemy.orm import Session
from fastapi import Request
from ..database.models import SystemLog, User
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class AuditService:
    """
    Service for recording system audit logs.
    Tracks critical actions performed by admins and users.
    """
    
    @staticmethod
    def log_action(
        db: Session,
        admin_id: int,
        action: str,
        target_type: str,
        target_id: str = None,
        details: str = None,
        request: Request = None
    ) -> SystemLog:
        """
        Record an action in the system logs.
        
        Args:
            db: Database session
            admin_id: ID of the user performing the action
            action: Action name (e.g., "BAN_USER", "DELETE_DOCUMENT")
            target_type: Type of entity affected (e.g., "USER", "DOCUMENT")
            target_id: ID of the entity affected
            details: Optional text/JSON details
            request: FastAPI Request object (to extract IP)
            
        Returns:
            Created SystemLog entry
        """
        try:
            ip_address = None
            if request:
                # Extract IP from request headers or client
                forwarded = request.headers.get("X-Forwarded-For")
                if forwarded:
                    ip_address = forwarded.split(",")[0].strip()
                elif request.client:
                    ip_address = request.client.host
            
            log_entry = SystemLog(
                admin_id=admin_id,
                action=action,
                target_type=target_type,
                target_id=str(target_id) if target_id else None,
                details=details,
                ip_address=ip_address,
                created_at=datetime.now(timezone.utc)
            )
            
            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)
            
            logger.info(f"AUDIT: Admin {admin_id} performed {action} on {target_type} {target_id}")
            return log_entry
            
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            # Don't raise exception to avoid breaking the main operation
            # Audit logging failure should be monitored but shouldn't crash the app
            return None

audit_service = AuditService()
