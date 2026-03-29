from datetime import datetime
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    username: str
    password: str
    phone: str | None = None


class UserOut(BaseModel):
    id: int
    email: str
    username: str
    phone: str | None = None
    point_balance: int
    grade: str

    model_config = {"from_attributes": True}


class ReviewOut(BaseModel):
    id: int
    product_id: int
    user_id: int
    rating: int
    title: str | None = None
    content: str
    likes: int
    helpful_count: int = 0
    is_helpful: bool = False
    created_at: datetime | None = None
    username: str | None = None

    model_config = {"from_attributes": True}


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    title: str | None = None
    cover_image: str | None = None
    sale_price: int | None = None

    model_config = {"from_attributes": True}


class AddCartRequest(BaseModel):
    product_id: int
    quantity: int = 1


class WishlistItemOut(BaseModel):
    id: int
    product_id: int
    title: str | None = None
    cover_image: str | None = None
    sale_price: int | None = None

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: int
    order_no: str
    total_amount: int
    status: str
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class BannerOut(BaseModel):
    id: int
    slot: str
    title: str | None = None
    image_url: str | None = None
    link_url: str | None = None
    display_order: int

    model_config = {"from_attributes": True}


class EventOut(BaseModel):
    id: int
    event_no: int
    title: str
    description: str | None = None
    banner_image: str | None = None
    content_html: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class SearchResult(BaseModel):
    items: list
    total: int
    page: int
    size: int
    query: str
