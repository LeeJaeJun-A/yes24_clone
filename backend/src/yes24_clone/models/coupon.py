from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func

from yes24_clone.models.base import Base


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False, default="")
    discount_type = Column(String(10), nullable=False)  # percent / fixed
    discount_value = Column(Integer, nullable=False)
    min_order_amount = Column(Integer, nullable=False, default=0)
    max_discount = Column(Integer)
    expires_at = Column(DateTime(timezone=True))
    is_active = Column(Boolean, nullable=False, default=True)
    usage_limit = Column(Integer, nullable=False, default=100)
    used_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class UserCoupon(Base):
    __tablename__ = "user_coupons"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    coupon_id = Column(Integer, ForeignKey("coupons.id"), nullable=False)
    used_at = Column(DateTime(timezone=True))
    order_id = Column(Integer, ForeignKey("orders.id"))
