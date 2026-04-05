from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user
from yes24_clone.models.user import User
from yes24_clone.models.coupon import Coupon, UserCoupon

router = APIRouter(prefix="/coupons", tags=["coupons"])


class CouponOut(BaseModel):
    id: int
    code: str
    name: str = ""
    discount_type: str
    discount_value: int
    min_order_amount: int
    max_discount: int | None = None
    expires_at: datetime | None = None
    is_active: bool
    used_at: datetime | None = None

    model_config = {"from_attributes": True}


class RegisterCouponRequest(BaseModel):
    code: str


class ValidateCouponRequest(BaseModel):
    code: str
    order_amount: int


@router.get("/my")
async def my_coupons(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserCoupon, Coupon)
        .join(Coupon, UserCoupon.coupon_id == Coupon.id)
        .where(UserCoupon.user_id == user.id)
    )
    rows = result.all()
    items = []
    for uc, coupon in rows:
        items.append({
            "id": uc.id,
            "coupon_id": coupon.id,
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": coupon.discount_value,
            "min_order_amount": coupon.min_order_amount,
            "max_discount": coupon.max_discount,
            "expires_at": coupon.expires_at.isoformat() if coupon.expires_at else None,
            "is_active": coupon.is_active,
            "used_at": uc.used_at.isoformat() if uc.used_at else None,
        })
    return items


@router.post("/register")
async def register_coupon(
    req: RegisterCouponRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Coupon).where(Coupon.code == req.code.upper()))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="유효하지 않은 쿠폰 코드입니다")
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="비활성화된 쿠폰입니다")
    if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="만료된 쿠폰입니다")
    if coupon.used_count >= coupon.usage_limit:
        raise HTTPException(status_code=400, detail="쿠폰 사용 한도를 초과했습니다")

    existing = await db.execute(
        select(UserCoupon).where(
            UserCoupon.user_id == user.id,
            UserCoupon.coupon_id == coupon.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 등록된 쿠폰입니다")

    uc = UserCoupon(user_id=user.id, coupon_id=coupon.id)
    db.add(uc)
    await db.commit()
    return {"message": "쿠폰이 등록되었습니다", "coupon_code": coupon.code}


@router.post("/validate")
async def validate_coupon(
    req: ValidateCouponRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Coupon).where(Coupon.code == req.code.upper()))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="유효하지 않은 쿠폰 코드입니다")
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="비활성화된 쿠폰입니다")
    if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="만료된 쿠폰입니다")
    if req.order_amount < coupon.min_order_amount:
        raise HTTPException(
            status_code=400,
            detail=f"최소 주문 금액 {coupon.min_order_amount}원 이상이어야 합니다",
        )

    # Check user has this coupon and hasn't used it
    uc_result = await db.execute(
        select(UserCoupon).where(
            UserCoupon.user_id == user.id,
            UserCoupon.coupon_id == coupon.id,
            UserCoupon.used_at.is_(None),
        )
    )
    if not uc_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="사용 가능한 쿠폰이 없습니다")

    if coupon.discount_type == "percent":
        discount = int(req.order_amount * coupon.discount_value / 100)
        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
    else:
        discount = coupon.discount_value

    return {
        "valid": True,
        "discount_amount": discount,
        "final_amount": req.order_amount - discount,
        "coupon_code": coupon.code,
    }


# ─── Apply coupon to cart ─────────────────────────────────────────────
class ApplyCouponRequest(BaseModel):
    code: str
    order_amount: int


@router.post("/apply")
async def apply_coupon(
    req: ApplyCouponRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply coupon code to cart and return discount amount."""
    result = await db.execute(select(Coupon).where(Coupon.code == req.code.upper()))
    coupon = result.scalar_one_or_none()
    if not coupon:
        raise HTTPException(status_code=404, detail="유효하지 않은 쿠폰 코드입니다")
    if not coupon.is_active:
        raise HTTPException(status_code=400, detail="비활성화된 쿠폰입니다")
    if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="만료된 쿠폰입니다")
    if req.order_amount < coupon.min_order_amount:
        raise HTTPException(status_code=400, detail=f"최소 주문 금액 {coupon.min_order_amount}원 이상이어야 합니다")

    # Register coupon for user if not already registered
    existing = await db.execute(
        select(UserCoupon).where(
            UserCoupon.user_id == user.id,
            UserCoupon.coupon_id == coupon.id,
        )
    )
    uc = existing.scalar_one_or_none()
    if not uc:
        uc = UserCoupon(user_id=user.id, coupon_id=coupon.id)
        db.add(uc)

    if uc.used_at is not None:
        raise HTTPException(status_code=400, detail="이미 사용된 쿠폰입니다")

    # Calculate discount
    if coupon.discount_type == "percent":
        discount = int(req.order_amount * coupon.discount_value / 100)
        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
    else:
        discount = coupon.discount_value

    # Mark as used
    uc.used_at = datetime.now(timezone.utc)
    coupon.used_count += 1
    await db.commit()

    return {
        "applied": True,
        "coupon_code": coupon.code,
        "discount_amount": discount,
        "final_amount": req.order_amount - discount,
    }


# ─── Points use ───────────────────────────────────────────────────────
class UsePointsRequest(BaseModel):
    order_amount: int
    points: int


@router.post("/points/use", tags=["points"])
async def use_points(
    req: UsePointsRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Use points on an order."""
    if req.points <= 0:
        raise HTTPException(status_code=400, detail="사용 포인트는 0보다 커야 합니다")
    if req.points > user.point_balance:
        raise HTTPException(status_code=400, detail="포인트가 부족합니다")
    if req.points > req.order_amount:
        raise HTTPException(status_code=400, detail="주문 금액을 초과하는 포인트는 사용할 수 없습니다")

    user.point_balance -= req.points
    await db.commit()

    return {
        "used_points": req.points,
        "remaining_points": user.point_balance,
        "final_amount": req.order_amount - req.points,
    }
