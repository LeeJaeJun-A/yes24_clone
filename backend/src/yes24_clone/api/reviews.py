import math
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import get_current_user, require_user
from yes24_clone.models.user import User
from yes24_clone.models.product import Product
from yes24_clone.models.review import Review
from yes24_clone.models.review_helpful import ReviewHelpful
from yes24_clone.schemas.common import PaginatedResponse
from yes24_clone.schemas.user import ReviewOut

router = APIRouter(tags=["reviews"])


class ReviewCreateRequest(BaseModel):
    rating: int
    content: str
    title: str | None = None


@router.post("/products/{goods_no}/reviews")
async def create_review(
    goods_no: int,
    req: ReviewCreateRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    prod = await db.execute(select(Product).where(Product.goods_no == goods_no))
    product = prod.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다.")
    if req.rating < 1 or req.rating > 5:
        raise HTTPException(status_code=400, detail="평점은 1~5 사이여야 합니다.")

    review = Review(
        product_id=product.id, user_id=user.id,
        rating=req.rating, title=req.title, content=req.content,
    )
    db.add(review)
    product.review_count += 1
    await db.commit()
    return {"message": "리뷰가 등록되었습니다.", "id": review.id}


@router.put("/products/{goods_no}/reviews/{review_id}")
async def update_product_review(
    goods_no: int,
    review_id: int,
    req: ReviewCreateRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id, Review.user_id == user.id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다")
    review.rating = req.rating
    review.content = req.content
    if req.title is not None:
        review.title = req.title
    await db.commit()
    return {"message": "리뷰가 수정되었습니다"}


@router.delete("/products/{goods_no}/reviews/{review_id}")
async def delete_product_review(
    goods_no: int,
    review_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id, Review.user_id == user.id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다")
    prod = await db.execute(select(Product).where(Product.id == review.product_id))
    product = prod.scalar_one_or_none()
    if product:
        product.review_count = max(0, product.review_count - 1)
    await db.delete(review)
    await db.commit()
    return {"message": "리뷰가 삭제되었습니다"}


@router.post("/products/{goods_no}/reviews/{review_id}/helpful")
async def toggle_product_review_helpful(
    goods_no: int,
    review_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다")

    existing = await db.execute(
        select(ReviewHelpful).where(
            ReviewHelpful.review_id == review_id,
            ReviewHelpful.user_id == user.id,
        )
    )
    vote = existing.scalar_one_or_none()

    if vote:
        await db.delete(vote)
        review.likes = max(0, review.likes - 1)
        is_helpful = False
    else:
        db.add(ReviewHelpful(review_id=review_id, user_id=user.id))
        review.likes += 1
        is_helpful = True

    await db.commit()
    return {"helpful_count": review.likes, "is_helpful": is_helpful}


@router.post("/reviews/{review_id}/helpful")
async def toggle_helpful(
    review_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다")

    # Check if already voted
    existing = await db.execute(
        select(ReviewHelpful).where(
            ReviewHelpful.review_id == review_id,
            ReviewHelpful.user_id == user.id,
        )
    )
    vote = existing.scalar_one_or_none()

    if vote:
        # Remove vote
        await db.delete(vote)
        review.likes = max(0, review.likes - 1)
        is_helpful = False
    else:
        # Add vote
        db.add(ReviewHelpful(review_id=review_id, user_id=user.id))
        review.likes += 1
        is_helpful = True

    await db.commit()

    return {"helpful_count": review.likes, "is_helpful": is_helpful}


@router.post("/reviews/{review_id}/likes")
async def like_review(review_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404)
    review.likes += 1
    await db.commit()
    return {"likes": review.likes}


@router.get("/reviews/my", response_model=PaginatedResponse[ReviewOut])
async def get_my_reviews(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's reviews"""
    query = (
        select(Review, User.username, Product.title.label("product_title"), Product.goods_no)
        .join(User, Review.user_id == User.id)
        .join(Product, Review.product_id == Product.id)
        .where(Review.user_id == user.id)
        .order_by(Review.created_at.desc())
    )
    count_q = select(func.count()).select_from(
        select(Review).where(Review.user_id == user.id).subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    rows = result.all()
    items = []
    for review, username, product_title, goods_no in rows:
        out = ReviewOut.model_validate(review)
        out.username = username
        out.helpful_count = review.likes
        items.append(out)
    return PaginatedResponse(
        items=items, total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


@router.put("/reviews/{review_id}")
async def update_review(
    review_id: int,
    req: ReviewCreateRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id, Review.user_id == user.id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다")
    review.rating = req.rating
    review.content = req.content
    if req.title is not None:
        review.title = req.title
    await db.commit()
    return {"message": "리뷰가 수정되었습니다."}


@router.delete("/reviews/{review_id}")
async def delete_review(
    review_id: int,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Review).where(Review.id == review_id, Review.user_id == user.id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="리뷰를 찾을 수 없습니다")
    # Decrement product review count
    prod = await db.execute(select(Product).where(Product.id == review.product_id))
    product = prod.scalar_one_or_none()
    if product:
        product.review_count = max(0, product.review_count - 1)
    await db.delete(review)
    await db.commit()
    return {"message": "리뷰가 삭제되었습니다."}


@router.get("/products/{goods_no}/reviews/stats")
async def get_review_stats(
    goods_no: int,
    db: AsyncSession = Depends(get_db),
):
    """Return rating distribution for a product."""
    prod_result = await db.execute(select(Product.id).where(Product.goods_no == goods_no))
    product_id = prod_result.scalar_one_or_none()
    if product_id is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    dist_q = (
        select(Review.rating, func.count())
        .where(Review.product_id == product_id)
        .group_by(Review.rating)
    )
    dist_result = await db.execute(dist_q)
    rating_dist = {r: 0 for r in range(1, 6)}
    total = 0
    for rating, count in dist_result.all():
        rating_dist[rating] = count
        total += count

    avg_q = select(func.avg(Review.rating)).where(Review.product_id == product_id)
    avg_result = await db.execute(avg_q)
    avg_rating = avg_result.scalar()

    return {
        "goods_no": goods_no,
        "total_reviews": total,
        "average_rating": round(float(avg_rating), 2) if avg_rating else 0,
        "rating_distribution": rating_dist,
    }


@router.get("/products/{goods_no}/reviews", response_model=PaginatedResponse[ReviewOut])
async def get_product_reviews(
    goods_no: int,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    sort: str = Query("newest"),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    prod_result = await db.execute(select(Product.id).where(Product.goods_no == goods_no))
    product_id = prod_result.scalar_one_or_none()
    if product_id is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    # Build helpful subquery for current user
    helpful_sub = None
    if current_user:
        helpful_sub = (
            select(ReviewHelpful.review_id)
            .where(
                ReviewHelpful.user_id == current_user.id,
                ReviewHelpful.review_id == Review.id,
            )
            .correlate(Review)
            .exists()
        )

    query = (
        select(
            Review,
            User.username,
        )
        .join(User, Review.user_id == User.id)
        .where(Review.product_id == product_id)
    )

    sort_map = {
        "newest": Review.created_at.desc(),
        "helpful": Review.likes.desc(),
        "rating_high": Review.rating.desc(),
        "rating_low": Review.rating.asc(),
    }
    query = query.order_by(sort_map.get(sort, Review.created_at.desc()))

    count_q = select(func.count()).select_from(
        select(Review).where(Review.product_id == product_id).subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0

    # Rating distribution
    dist_q = (
        select(Review.rating, func.count())
        .where(Review.product_id == product_id)
        .group_by(Review.rating)
    )
    dist_result = await db.execute(dist_q)
    rating_dist = {r: 0 for r in range(1, 6)}
    for rating, count in dist_result.all():
        rating_dist[rating] = count

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    rows = result.all()

    # Get helpful status for current user if logged in
    is_helpful_map = {}
    if current_user and rows:
        review_ids = [r[0].id for r in rows]
        helpful_result = await db.execute(
            select(ReviewHelpful.review_id).where(
                ReviewHelpful.user_id == current_user.id,
                ReviewHelpful.review_id.in_(review_ids),
            )
        )
        is_helpful_map = {rid for (rid,) in helpful_result.all()}

    items = []
    for review, username in rows:
        out = ReviewOut.model_validate(review)
        out.username = username
        out.helpful_count = review.likes
        out.is_helpful = review.id in is_helpful_map
        items.append(out)

    return PaginatedResponse(
        items=items, total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
        meta={"rating_distribution": rating_dist},
    )
