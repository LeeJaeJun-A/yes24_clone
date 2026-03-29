from sqlalchemy import Boolean, Column, Integer, String, Text, Date, DateTime, ForeignKey
from sqlalchemy.sql import func

from yes24_clone.models.base import Base


class Funding(Base):
    __tablename__ = "fundings"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    title = Column(String(500))
    description = Column(Text)
    goal_amount = Column(Integer)
    current_amount = Column(Integer, default=0)
    backer_count = Column(Integer, default=0)
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
