from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from yes24_clone.models.base import Base


class ProductQnA(Base):
    __tablename__ = "product_qna"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question_title = Column(String(200), nullable=False)
    question_body = Column(Text, nullable=False)
    answer_body = Column(Text)
    is_answered = Column(Boolean, nullable=False, default=False)
    is_secret = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    answered_at = Column(DateTime(timezone=True))
