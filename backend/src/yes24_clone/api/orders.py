from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user
from yes24_clone.models.user import User
from yes24_clone.models.order import Order, OrderItem
from yes24_clone.models.product import Product
from yes24_clone.schemas.user import OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderOut])
async def get_orders(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.user_id == user.id).order_by(Order.created_at.desc())
    )
    orders = result.scalars().all()
    return [OrderOut.model_validate(o) for o in orders]


@router.post("/{order_no}/cancel")
async def cancel_order(
    order_no: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.order_no == order_no, Order.user_id == user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    if order.status in ("cancelled", "CANCELLED"):
        raise HTTPException(status_code=400, detail="이미 취소된 주문입니다")
    if order.status in ("delivered", "DELIVERED"):
        raise HTTPException(status_code=400, detail="배송완료된 주문은 취소할 수 없습니다")
    order.status = "CANCELLED"
    await db.commit()
    return {"message": "주문이 취소되었습니다", "order_no": order_no}


@router.get("/{order_no}")
async def get_order_detail(
    order_no: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.order_no == order_no, Order.user_id == user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")

    items_result = await db.execute(
        select(OrderItem, Product.title, Product.cover_image)
        .join(Product, OrderItem.product_id == Product.id)
        .where(OrderItem.order_id == order.id)
    )
    order_items = []
    for oi, title, cover_image in items_result.all():
        order_items.append({
            "product_id": oi.product_id,
            "quantity": oi.quantity,
            "unit_price": oi.unit_price,
            "title": title,
            "cover_image": cover_image,
        })

    return {
        "order_no": order.order_no,
        "total_amount": order.total_amount,
        "status": order.status,
        "shipping_addr": order.shipping_addr,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": order_items,
    }


# ─── Order Tracking ──────────────────────────────────────────────────
@router.get("/{order_no}/tracking")
async def get_order_tracking(
    order_no: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Return fake shipping tracking info."""
    result = await db.execute(
        select(Order).where(Order.order_no == order_no, Order.user_id == user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")

    # Fake tracking data
    tracking = {
        "order_no": order.order_no,
        "carrier": "CJ대한통운",
        "tracking_number": f"63829{order.id:08d}",
        "status": order.status,
        "events": [
            {"time": "2026-04-01 09:00", "location": "서울 송파 집하점", "status": "집하"},
            {"time": "2026-04-01 14:00", "location": "서울 Hub", "status": "간선상차"},
            {"time": "2026-04-02 06:00", "location": "목적지 Hub", "status": "간선하차"},
            {"time": "2026-04-02 09:00", "location": "배달 출발", "status": "배달중"},
        ],
    }
    if order.status in ("DELIVERED", "delivered"):
        tracking["events"].append(
            {"time": "2026-04-02 14:30", "location": "수령인", "status": "배달완료"}
        )
    return tracking


# ─── Return Request ──────────────────────────────────────────────────
class ReturnRequest(BaseModel):
    reason: str = ""


@router.post("/{order_no}/return")
async def request_return(
    order_no: str,
    body: ReturnRequest = ReturnRequest(),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Request a return for an order."""
    result = await db.execute(
        select(Order).where(Order.order_no == order_no, Order.user_id == user.id)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없습니다")
    if order.status in ("CANCELLED", "cancelled"):
        raise HTTPException(status_code=400, detail="취소된 주문은 반품할 수 없습니다")
    if order.status in ("RETURN_REQUESTED", "return_requested"):
        raise HTTPException(status_code=400, detail="이미 반품 요청된 주문입니다")

    order.status = "RETURN_REQUESTED"
    await db.commit()
    return {
        "message": "반품 요청이 접수되었습니다",
        "order_no": order_no,
        "status": "RETURN_REQUESTED",
        "reason": body.reason,
    }
