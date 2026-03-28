import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user
from yes24_clone.models.user import User
from yes24_clone.models.cart import CartItem
from yes24_clone.models.product import Product
from yes24_clone.models.order import Order, OrderItem

router = APIRouter(prefix="/checkout", tags=["checkout"])


@router.post("/create-order")
async def create_order(
    address_id: int = None,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    # Get cart items
    result = await db.execute(
        select(CartItem, Product).join(Product, CartItem.product_id == Product.id).where(CartItem.user_id == user.id)
    )
    rows = result.all()
    if not rows:
        raise HTTPException(status_code=400, detail="카트가 비어 있습니다.")

    total = sum(p.sale_price * ci.quantity for ci, p in rows)
    order_no = f"YS{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"

    # Create order
    order = Order(
        order_no=order_no, user_id=user.id, total_amount=total,
        status="PAID",
        shipping_addr=f"Address #{address_id}" if address_id else "기본 배송지",
    )
    db.add(order)
    await db.flush()

    # Create order items
    items_out = []
    for ci, p in rows:
        oi = OrderItem(order_id=order.id, product_id=p.id, quantity=ci.quantity, unit_price=p.sale_price)
        db.add(oi)
        items_out.append({"title": p.title, "quantity": ci.quantity, "price": p.sale_price})

    # Clear cart
    await db.execute(delete(CartItem).where(CartItem.user_id == user.id))

    # Deduct points (mock)
    point_earn = int(total * 0.05)
    user.point_balance += point_earn

    await db.commit()

    return {
        "order_no": order_no,
        "total_amount": total,
        "point_earned": point_earn,
        "items": items_out,
        "status": "PAID",
        "message": "주문이 완료되었습니다.",
    }


@router.post("/direct-order")
async def direct_order(
    goods_no: int, quantity: int = 1,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.goods_no == goods_no))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")

    total = product.sale_price * quantity
    order_no = f"YS{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"

    order = Order(
        order_no=order_no, user_id=user.id, total_amount=total,
        status="PAID", shipping_addr="기본 배송지",
    )
    db.add(order)
    await db.flush()

    oi = OrderItem(order_id=order.id, product_id=product.id, quantity=quantity, unit_price=product.sale_price)
    db.add(oi)

    point_earn = int(total * 0.05)
    user.point_balance += point_earn
    await db.commit()

    return {
        "order_no": order_no, "total_amount": total, "point_earned": point_earn,
        "items": [{"title": product.title, "quantity": quantity, "price": product.sale_price}],
        "status": "PAID", "message": "주문이 완료되었습니다.",
    }
