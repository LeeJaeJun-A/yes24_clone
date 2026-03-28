from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user
from yes24_clone.models.user import User
from yes24_clone.models.wishlist import WishlistItem
from yes24_clone.models.product import Product
from yes24_clone.schemas.user import WishlistItemOut

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=list[WishlistItemOut])
async def get_wishlist(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(WishlistItem, Product.title, Product.cover_image, Product.sale_price)
        .join(Product, WishlistItem.product_id == Product.id)
        .where(WishlistItem.user_id == user.id)
        .order_by(WishlistItem.created_at.desc())
    )
    items = []
    for wi, title, cover_image, sale_price in result.all():
        out = WishlistItemOut.model_validate(wi)
        out.title = title
        out.cover_image = cover_image
        out.sale_price = sale_price
        items.append(out)
    return items


@router.post("", response_model=WishlistItemOut)
async def add_to_wishlist(
    product_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    prod = await db.execute(select(Product).where(Product.id == product_id))
    product = prod.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404)

    existing = await db.execute(
        select(WishlistItem).where(
            WishlistItem.user_id == user.id, WishlistItem.product_id == product_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 위시리스트에 있습니다")

    item = WishlistItem(user_id=user.id, product_id=product_id)
    db.add(item)
    await db.commit()
    await db.refresh(item)

    out = WishlistItemOut.model_validate(item)
    out.title = product.title
    out.cover_image = product.cover_image
    out.sale_price = product.sale_price
    return out


@router.delete("/{item_id}")
async def remove_from_wishlist(
    item_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        delete(WishlistItem).where(WishlistItem.id == item_id, WishlistItem.user_id == user.id)
    )
    await db.commit()
    return {"message": "위시리스트에서 삭제되었습니다"}
