from typing import Optional

from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session

from .models import Task, Priority, TaskStatus


def list_tasks(
    db: Session,
    owner_id: int,
    status: Optional[TaskStatus],
    priority: Optional[Priority],
    q: Optional[str],
    page: int,
    size: int,
) -> dict:
    stmt = select(Task).where(Task.owner_id == owner_id)
    if status:
        stmt = stmt.where(Task.status == status)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Task.title.ilike(like), Task.description.ilike(like)))

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.order_by(Task.created_at.desc(), Task.id.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).all()
    return {"items": items, "total": total, "page": page, "size": size}
