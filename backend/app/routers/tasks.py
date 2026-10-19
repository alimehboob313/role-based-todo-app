from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Task, User, Priority, TaskStatus
from ..schemas import TaskCreate, TaskUpdate, TaskOut, Page
from ..utils import list_tasks

router = APIRouter(prefix="/tasks", tags=["tasks"])


def own_task_or_404(db: Session, task_id: int, user: User) -> Task:
    task = db.scalar(select(Task).where(Task.id == task_id, Task.owner_id == user.id))
    if task is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return task


@router.get("", response_model=Page[TaskOut])
def get_tasks(
    status: Optional[TaskStatus] = None,
    priority: Optional[Priority] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return list_tasks(db, user.id, status, priority, q, page, size)


@router.post("", response_model=TaskOut, status_code=201)
def create_task(data: TaskCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = Task(**data.model_dump(), owner_id=user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return own_task_or_404(db, task_id, user)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    task = own_task_or_404(db, task_id, user)
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field in ("title", "priority", "status"):
            continue  # these columns cannot be null
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}/complete", response_model=TaskOut)
def complete_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = own_task_or_404(db, task_id, user)
    task.status = TaskStatus.done
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    task = own_task_or_404(db, task_id, user)
    db.delete(task)
    db.commit()
    return Response(status_code=204)
