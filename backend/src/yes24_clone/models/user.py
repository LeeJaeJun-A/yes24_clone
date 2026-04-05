from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

from yes24_clone.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(200), unique=True, nullable=False)
    username = Column(String(100), nullable=False)
    password_hash = Column(String(200), nullable=False)
    phone = Column(String(20))
    point_balance = Column(Integer, nullable=False, default=0)
    grade = Column(String(20), nullable=False, default="SILVER")
    is_active = Column(Boolean, nullable=False, default=True)
    is_admin = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
