from sqlalchemy import (
    Boolean, Column, Integer, BigInteger, SmallInteger, String, Text,
    Date, DateTime, Numeric, ARRAY,
)
from sqlalchemy.sql import func

from yes24_clone.models.base import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    goods_no = Column(BigInteger, unique=True, nullable=False)
    title = Column(String(500), nullable=False)
    subtitle = Column(String(500))
    author = Column(String(300), nullable=False)
    translator = Column(String(200))
    publisher = Column(String(200), nullable=False)
    publish_date = Column(Date)
    isbn = Column(String(20))
    category_code = Column(String(12), nullable=False)
    product_type = Column(String(20), nullable=False, default="book")
    original_price = Column(Integer, nullable=False)
    sale_price = Column(Integer, nullable=False)
    discount_rate = Column(SmallInteger, nullable=False, default=0)
    point_rate = Column(SmallInteger, nullable=False, default=5)
    description = Column(Text)
    toc = Column(Text)
    cover_image = Column(String(500))
    page_count = Column(SmallInteger)
    weight_grams = Column(SmallInteger)
    dimensions = Column(String(50))
    stock_quantity = Column(Integer, nullable=False, default=999)
    is_soldout = Column(Boolean, nullable=False, default=False)
    sales_index = Column(Integer, nullable=False, default=0)
    review_count = Column(Integer, nullable=False, default=0)
    rating_avg = Column(Numeric(2, 1), nullable=False, default=0.0)
    is_available = Column(Boolean, nullable=False, default=True)
    tags = Column(ARRAY(Text))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
