from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user
from yes24_clone.models.user import User
from yes24_clone.models.product import Product
from yes24_clone.models.review import Review

router = APIRouter(tags=["reviews"])


@router.post("/products/{goods_no}/reviews")
async def create_review(
    goods_no: int, rating: int, content: str, title: str = None,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    prod = await db.execute(select(Product).where(Product.goods_no == goods_no))
    product = prod.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="평점은 1~5 사이여야 합니다.")

    review = Review(product_id=product.id, user_id=user.id, rating=rating, title=title, content=content)
    db.add(review)
    product.review_count += 1
    await db.commit()
    return {"message": "리뷰가 등록되었습니다."}


@router.post("/reviews/{review_id}/likes")
async def like_review(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404)
    review.likes += 1
    await db.commit()
    return {"likes": review.likes}
