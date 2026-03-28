from sqlalchemy import Boolean, Column, Integer, SmallInteger, String, DateTime
from sqlalchemy.sql import func

from yes24_clone.models.base import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    code = Column(String(12), unique=True, nullable=False)
    name_ko = Column(String(100), nullable=False)
    name_en = Column(String(100))
    parent_code = Column(String(12))
    depth = Column(SmallInteger, nullable=False, default=1)
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    icon_url = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
