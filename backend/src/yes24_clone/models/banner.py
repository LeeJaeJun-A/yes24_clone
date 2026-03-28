from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.sql import func

from yes24_clone.models.base import Base


class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True)
    slot = Column(String(50), nullable=False)
    title = Column(String(200))
    image_url = Column(String(500))
    link_url = Column(String(500))
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
