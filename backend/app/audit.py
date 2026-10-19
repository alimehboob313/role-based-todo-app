from typing import Optional

from sqlalchemy.orm import Session

from .models import AuditLog, User


def log_action(
    db: Session,
    admin: User,
    action: str,
    target_user_id: Optional[int] = None,
    target_task_id: Optional[int] = None,
    details: Optional[dict] = None,
) -> None:
    db.add(
        AuditLog(
            admin_id=admin.id,
            action=action,
            target_user_id=target_user_id,
            target_task_id=target_task_id,
            details=details,
        )
    )
