import enum
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from ..audit import log_action
from ..database import get_db
from ..deps import get_current_admin
from ..models import User, Task, AuditLog, Priority, TaskStatus
from ..schemas import UserOut, UserAdminUpdate, TaskOut, TaskUpdate, Page, AuditOut
from ..utils import list_tasks

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


def plain(value):
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, date):
        return value.isoformat()
    return value


def user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


def task_of_user_or_404(db: Session, user_id: int, task_id: int) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id, Task.owner_id == user_id))
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


@router.get("/users", response_model=Page[UserOut])
def list_users(
    q: Optional[str] = None,
    is_active: Optional[bool] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    stmt = select(User)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.email.ilike(like), User.full_name.ilike(like)))
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(stmt.order_by(User.id).offset((page - 1) * size).limit(size)).all()
    return {"items": items, "total": total, "page": page, "size": size}


@router.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: int, db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    user = user_or_404(db, user_id)
    log_action(db, admin, "view_user", target_user_id=user.id)
    db.commit()
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = user_or_404(db, user_id)
    changes = data.model_dump(exclude_unset=True)

    if changes.get("email") is not None:
        new_email = changes["email"].lower()
        taken = db.scalar(select(User).where(User.email == new_email, User.id != user.id))
        if taken:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already in use")
        changes["email"] = new_email

    if changes.get("is_active") is False and user.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot deactivate your own account")

    profile_changes = {}
    status_change = None
    for field, value in changes.items():
        if value is None:
            continue
        old = getattr(user, field)
        if old == value:
            continue
        setattr(user, field, value)
        if field == "is_active":
            status_change = value
        else:
            profile_changes[field] = {"old": old, "new": value}

    if profile_changes:
        log_action(db, admin, "update_user", target_user_id=user.id, details=profile_changes)
    if status_change is not None:
        action = "activate_user" if status_change else "deactivate_user"
        log_action(db, admin, action, target_user_id=user.id)

    db.commit()
    db.refresh(user)
    return user


@router.get("/users/{user_id}/tasks", response_model=Page[TaskOut])
def list_user_tasks(
    user_id: int,
    status: Optional[TaskStatus] = None,
    priority: Optional[Priority] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = user_or_404(db, user_id)
    log_action(db, admin, "view_user_tasks", target_user_id=user.id)
    db.commit()
    return list_tasks(db, user.id, status, priority, q, page, size)


@router.patch("/users/{user_id}/tasks/{task_id}", response_model=TaskOut)
def update_user_task(
    user_id: int,
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = user_or_404(db, user_id)
    task = task_of_user_or_404(db, user.id, task_id)

    details = {}
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field in ("title", "priority", "status"):
            continue
        old = getattr(task, field)
        if old != value:
            details[field] = {"old": plain(old), "new": plain(value)}
            setattr(task, field, value)

    if details:
        log_action(db, admin, "update_task", target_user_id=user.id, target_task_id=task.id, details=details)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/users/{user_id}/tasks/{task_id}", status_code=204)
def delete_user_task(
    user_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    user = user_or_404(db, user_id)
    task = task_of_user_or_404(db, user.id, task_id)
    log_action(
        db, admin, "delete_task",
        target_user_id=user.id, target_task_id=task.id, details={"title": task.title},
    )
    db.delete(task)
    db.commit()
    return Response(status_code=204)


@router.get("/audit-logs", response_model=Page[AuditOut])
def list_audit_logs(
    action: Optional[str] = None,
    target_user_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if target_user_id is not None:
        stmt = stmt.where(AuditLog.target_user_id == target_user_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    return {"items": items, "total": total, "page": page, "size": size}
