from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user
from yes24_clone.models.user import User
from yes24_clone.models.cart import CartItem
from yes24_clone.models.product import Product
from yes24_clone.schemas.user import CartItemOut, AddCartRequest

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=list[CartItemOut])
async def get_cart(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CartItem, Product.title, Product.cover_image, Product.sale_price)
        .join(Product, CartItem.product_id == Product.id)
        .where(CartItem.user_id == user.id)
        .order_by(CartItem.created_at.desc())
    )
    items = []
    for cart_item, title, cover_image, sale_price in result.all():
        out = CartItemOut.model_validate(cart_item)
        out.title = title
        out.cover_image = cover_image
        out.sale_price = sale_price
        items.append(out)
    return items


@router.post("", response_model=CartItemOut)
async def add_to_cart(
    body: AddCartRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    # Check product exists
    prod = await db.execute(select(Product).where(Product.id == body.product_id))
    product = prod.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    # Upsert
    existing = await db.execute(
        select(CartItem).where(
            CartItem.user_id == user.id, CartItem.product_id == body.product_id
        )
    )
    item = existing.scalar_one_or_none()
    if item:
        item.quantity += body.quantity
    else:
        item = CartItem(user_id=user.id, product_id=body.product_id, quantity=body.quantity)
        db.add(item)

    await db.commit()
    await db.refresh(item)

    out = CartItemOut.model_validate(item)
    out.title = product.title
    out.cover_image = product.cover_image
    out.sale_price = product.sale_price
    return out


@router.put("/{item_id}")
async def update_cart_item(
    item_id: int,
    quantity: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404)
    item.quantity = quantity
    await db.commit()
    return {"message": "수량이 변경되었습니다"}


@router.delete("/{item_id}")
async def remove_from_cart(
    item_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(CartItem).where(CartItem.id == item_id, CartItem.user_id == user.id)
    )
    await db.commit()
    return {"message": "장바구니에서 삭제되었습니다"}
