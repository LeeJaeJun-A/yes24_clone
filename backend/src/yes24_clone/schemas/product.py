from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel


class ProductListOut(BaseModel):
    id: int
    goods_no: int
    title: str
    author: str
    publisher: str
    original_price: int
    sale_price: int
    discount_rate: int
    cover_image: str | None = None
    rating_avg: Decimal
    review_count: int
    sales_index: int
    is_available: bool
    publish_date: date | None = None
    product_type: str

    model_config = {"from_attributes": True}


class ProductDetailOut(ProductListOut):
    subtitle: str | None = None
    translator: str | None = None
    isbn: str | None = None
    category_code: str
    point_rate: int
    description: str | None = None
    toc: str | None = None
    page_count: int | None = None
    weight_grams: int | None = None
    dimensions: str | None = None
    tags: list[str] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
