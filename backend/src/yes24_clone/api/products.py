import math
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from yes24_clone.db.session import get_db
from yes24_clone.models.product import Product
from yes24_clone.models.review import Review
from yes24_clone.models.user import User
from yes24_clone.schemas.product import ProductDetailOut, ProductListOut
from yes24_clone.schemas.user import ReviewOut
from yes24_clone.schemas.common import PaginatedResponse

router = APIRouter(prefix="/products", tags=["products"])


@router.get("/bestseller", response_model=PaginatedResponse[ProductListOut])
async def get_bestsellers(
    category_code: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.is_available == True)
    if category_code:
        query = query.where(Product.category_code.startswith(category_code))
    query = query.order_by(Product.sales_index.desc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedResponse(
        items=[ProductListOut.model_validate(p) for p in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


@router.get("/new", response_model=list[ProductListOut])
async def get_new_arrivals(
    category_code: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.is_available == True)
    if category_code:
        query = query.where(Product.category_code.startswith(category_code))
    query = query.order_by(Product.publish_date.desc()).limit(limit)
    result = await db.execute(query)
    return [ProductListOut.model_validate(p) for p in result.scalars().all()]


@router.get("/recommended", response_model=list[ProductListOut])
async def get_recommended(
    limit: int = Query(12, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Product)
        .where(Product.is_available == True)
        .where(Product.rating_avg >= 4.0)
        .order_by(func.random())
        .limit(limit)
    )
    result = await db.execute(query)
    return [ProductListOut.model_validate(p) for p in result.scalars().all()]


@router.get("/steady", response_model=PaginatedResponse[ProductListOut])
async def get_steady_sellers(
    category_code: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=120),
    db: AsyncSession = Depends(get_db),
):
    from datetime import date, timedelta
    one_year_ago = date.today() - timedelta(days=365)
    query = select(Product).where(
        Product.is_available == True,
        Product.publish_date <= one_year_ago,
        Product.sales_index >= 50,
    )
    if category_code:
        query = query.where(Product.category_code.startswith(category_code))
    query = query.order_by(Product.sales_index.desc())
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(
        items=[ProductListOut.model_validate(p) for p in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


@router.get("/by-author", response_model=PaginatedResponse[ProductListOut])
async def get_by_author(
    author: str = Query(...),
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=120),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.author == author).order_by(Product.publish_date.desc())
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(
        items=[ProductListOut.model_validate(p) for p in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


@router.get("/by-publisher", response_model=PaginatedResponse[ProductListOut])
async def get_by_publisher(
    publisher: str = Query(...),
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=120),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.publisher == publisher).order_by(Product.publish_date.desc())
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(
        items=[ProductListOut.model_validate(p) for p in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


@router.get("/by-tag", response_model=PaginatedResponse[ProductListOut])
async def get_by_tag(
    tag: str = Query(...),
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=120),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.tags.any(tag)).order_by(Product.sales_index.desc())
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()
    return PaginatedResponse(
        items=[ProductListOut.model_validate(p) for p in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


@router.get("/{goods_no}", response_model=ProductDetailOut)
async def get_product(goods_no: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.goods_no == goods_no))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    return ProductDetailOut.model_validate(product)


@router.get("/{goods_no}/reviews", response_model=PaginatedResponse[ReviewOut])
async def get_product_reviews(
    goods_no: int,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    # Get product id
    prod_result = await db.execute(select(Product.id).where(Product.goods_no == goods_no))
    product_id = prod_result.scalar_one_or_none()
    if product_id is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    query = select(Review, User.username).join(User, Review.user_id == User.id).where(
        Review.product_id == product_id
    ).order_by(Review.created_at.desc())

    count_q = select(func.count()).select_from(
        select(Review).where(Review.product_id == product_id).subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for review, username in rows:
        out = ReviewOut.model_validate(review)
        out.username = username
        items.append(out)

    return PaginatedResponse(
        items=items, total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )
