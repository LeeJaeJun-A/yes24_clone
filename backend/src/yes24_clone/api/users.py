import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
import bcrypt as _bcrypt
import redis.asyncio as aioredis

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user, get_redis
from yes24_clone.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile")
async def get_profile(user: User = Depends(require_user)):
    return {
        "id": user.id, "email": user.email, "username": user.username,
        "phone": user.phone, "point_balance": user.point_balance, "grade": user.grade,
    }


@router.put("/profile")
async def update_profile(
    username: str = None, phone: str = None,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if username: user.username = username
    if phone: user.phone = phone
    await db.commit()
    return {"message": "프로필이 수정되었습니다."}


@router.post("/change-password")
async def change_password(
    current_password: str, new_password: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if not _bcrypt.checkpw(current_password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    user.password_hash = _bcrypt.hashpw(new_password.encode(), _bcrypt.gensalt()).decode()
    await db.commit()
    return {"message": "비밀번호가 변경되었습니다."}


@router.get("/addresses")
async def get_addresses(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, label, recipient, phone, zipcode, address1, address2, is_default FROM user_addresses WHERE user_id = :uid ORDER BY is_default DESC, id DESC"),
        {"uid": user.id},
    )
    return [dict(r._mapping) for r in result.all()]


@router.post("/addresses")
async def add_address(
    label: str, recipient: str, phone: str, zipcode: str,
    address1: str, address2: str = "",
    is_default: bool = False,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if is_default:
        await db.execute(text("UPDATE user_addresses SET is_default = FALSE WHERE user_id = :uid"), {"uid": user.id})
    await db.execute(
        text("INSERT INTO user_addresses (user_id, label, recipient, phone, zipcode, address1, address2, is_default) VALUES (:uid, :label, :recipient, :phone, :zipcode, :addr1, :addr2, :is_default)"),
        {"uid": user.id, "label": label, "recipient": recipient, "phone": phone, "zipcode": zipcode, "addr1": address1, "addr2": address2, "is_default": is_default},
    )
    await db.commit()
    return {"message": "주소가 등록되었습니다."}


@router.delete("/addresses/{address_id}")
async def delete_address(address_id: int, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM user_addresses WHERE id = :id AND user_id = :uid"), {"id": address_id, "uid": user.id})
    await db.commit()
    return {"message": "주소가 삭제되었습니다."}


@router.get("/dashboard")
async def get_dashboard(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    from yes24_clone.models.order import Order
    from yes24_clone.models.wishlist import WishlistItem
    from yes24_clone.models.cart import CartItem

    orders_count = (await db.execute(
        select(func.count()).where(Order.user_id == user.id)
    )).scalar() or 0
    wishlist_count = (await db.execute(
        select(func.count()).where(WishlistItem.user_id == user.id)
    )).scalar() or 0
    cart_count = (await db.execute(
        select(func.count()).where(CartItem.user_id == user.id)
    )).scalar() or 0

    return {
        "orders_count": orders_count,
        "wishlist_count": wishlist_count,
        "cart_count": cart_count,
        "coupon_count": 2,
        "point_balance": user.point_balance,
        "grade": user.grade,
    }


@router.get("/recently-viewed")
async def get_recently_viewed(
    user: User = Depends(require_user),
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    from yes24_clone.models.product import Product as Prod
    from yes24_clone.schemas.product import ProductListOut

    key = f"recent:{user.id}"
    goods_nos = await redis.lrange(key, 0, 19)
    if not goods_nos:
        return []

    goods_ids = [int(g) for g in goods_nos]
    result = await db.execute(select(Prod).where(Prod.goods_no.in_(goods_ids)))
    products = {p.goods_no: p for p in result.scalars().all()}
    return [ProductListOut.model_validate(products[gid]) for gid in goods_ids if gid in products]


@router.post("/recently-viewed")
async def add_recently_viewed(
    goods_no: int,
    user: User = Depends(require_user),
    redis: aioredis.Redis = Depends(get_redis),
):
    key = f"recent:{user.id}"
    await redis.lrem(key, 0, str(goods_no))
    await redis.lpush(key, str(goods_no))
    await redis.ltrim(key, 0, 19)
    await redis.expire(key, 86400 * 30)
    return {"message": "ok"}


@router.put("/me")
async def update_me(
    username: str = None, phone: str = None,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if username:
        user.username = username
    if phone:
        user.phone = phone
    await db.commit()
    return {"message": "프로필이 수정되었습니다"}


@router.get("/{user_id}/public")
async def get_public_profile(user_id: int, db: AsyncSession = Depends(get_db)):
    from yes24_clone.models.review import Review
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
    review_count = (await db.execute(
        select(func.count()).where(Review.user_id == user_id)
    )).scalar() or 0
    return {
        "username": user.username,
        "grade": user.grade,
        "review_count": review_count,
        "join_date": user.created_at.isoformat() if user.created_at else None,
    }


@router.get("/points-history")
async def get_points_history(user: User = Depends(require_user)):
    # Stub: return mock points history
    return [
        {"date": "2026-03-27", "description": "도서 구매 적립", "amount": 500, "balance": user.point_balance},
        {"date": "2026-03-20", "description": "리뷰 작성 적립", "amount": 200, "balance": user.point_balance - 500},
        {"date": "2026-03-15", "description": "가입 축하 포인트", "amount": 5000, "balance": user.point_balance - 700},
    ]


@router.get("/me/coupons")
async def get_my_coupons(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Return mock coupons for the user"""
    return [
        {"id": 1, "code": "WELCOME2026", "name": "신규가입 쿠폰", "discount_type": "PERCENT", "discount_value": 10, "min_order_amount": 15000, "max_discount": 3000, "end_date": "2026-12-31", "status": "사용가능"},
        {"id": 2, "code": "SPRING500", "name": "봄맞이 할인 쿠폰", "discount_type": "FIXED", "discount_value": 500, "min_order_amount": 10000, "max_discount": None, "end_date": "2026-06-30", "status": "사용가능"},
        {"id": 3, "code": "REVIEW200", "name": "리뷰 작성 감사 쿠폰", "discount_type": "FIXED", "discount_value": 200, "min_order_amount": 5000, "max_discount": None, "end_date": "2026-04-30", "status": "사용가능"},
        {"id": 4, "code": "NEWYEAR26", "name": "새해 특별 쿠폰", "discount_type": "PERCENT", "discount_value": 15, "min_order_amount": 20000, "max_discount": 5000, "end_date": "2026-01-31", "status": "만료"},
    ]
