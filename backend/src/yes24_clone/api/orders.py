from fastapi import APIRouter, Depends, HTTPException
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
