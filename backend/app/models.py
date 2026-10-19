import enum
from datetime import datetime, date
from typing import Optional

from sqlalchemy import String, Text, ForeignKey, Enum, Boolean, DateTime, Date, JSON, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def enum_values(e):
    return [x.value for x in e]


class Role(str, enum.Enum):
    user = "user"
    admin = "admin"


class Priority(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TaskStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in-progress"
    done = "done"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        Enum(Role, name="role", values_callable=enum_values),
        default=Role.user,
        server_default="user",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    tasks: Mapped[list["Task"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[Priority] = mapped_column(
        Enum(Priority, name="priority", values_callable=enum_values),
        default=Priority.medium,
        server_default="medium",
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, name="task_status", values_callable=enum_values),
        default=TaskStatus.pending,
        server_default="pending",
    )
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    owner: Mapped["User"] = relationship(back_populates="tasks")

    __table_args__ = (Index("ix_tasks_owner_status", "owner_id", "status"),)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    admin_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    action: Mapped[str] = mapped_column(String(60), index=True)
    target_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # No foreign key on purpose: the log entry must survive deletion of the task.
    target_task_id: Mapped[Optional[int]] = mapped_column(nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
