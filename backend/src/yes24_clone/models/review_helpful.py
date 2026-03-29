from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint

from yes24_clone.models.base import Base


class ReviewHelpful(Base):
    __tablename__ = "review_helpful"

    id = Column(Integer, primary_key=True)
    review_id = Column(Integer, ForeignKey("reviews.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    __table_args__ = (
        UniqueConstraint("review_id", "user_id", name="uq_review_helpful_user"),
    )
