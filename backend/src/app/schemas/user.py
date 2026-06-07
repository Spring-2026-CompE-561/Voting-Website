from datetime import datetime
import re

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.models.user import UserRole


# -----------------------------
# Base
# -----------------------------
class UserBase(BaseModel):
    email: EmailStr


# -----------------------------
# Create (input)
# -----------------------------
class UserCreate(UserBase):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must include at least one uppercase letter")
        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError("Password must include at least one special character")
        return value


class UserUpdate(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not re.search(r"[A-Z]", value):
            raise ValueError("Password must include at least one uppercase letter")
        if not re.search(r"[^A-Za-z0-9]", value):
            raise ValueError("Password must include at least one special character")
        return value


# -----------------------------
# Response (output)
# -----------------------------
class UserOut(UserBase):
    id: int
    created_at: datetime
    role: UserRole

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserStats(BaseModel):
    total_answers: int
    current_streak: int
    longest_streak: int
