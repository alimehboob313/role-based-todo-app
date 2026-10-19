from datetime import date, datetime
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import Priority, TaskStatus, Role

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=72)  # bcrypt limit is 72 bytes


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime


class UserAdminUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Priority = Priority.medium
    status: TaskStatus = TaskStatus.pending
    due_date: Optional[date] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[date] = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    owner_id: int
    title: str
    description: Optional[str]
    priority: Priority
    status: TaskStatus
    due_date: Optional[date]
    created_at: datetime
    updated_at: datetime


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    admin_id: Optional[int]
    action: str
    target_user_id: Optional[int]
    target_task_id: Optional[int]
    details: Optional[dict]
    created_at: datetime
