import math
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
import redis.asyncio as aioredis

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import get_redis
from yes24_clone.models.product import Product
from yes24_clone.schemas.product import ProductListOut
from yes24_clone.schemas.common import PaginatedResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=PaginatedResponse[ProductListOut])
async def search_products(
    query: str = Query(None, alias="query"),
    q: str = Query(None),
    domain: str = Query("ALL"),
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=120),
    sort: str = Query("relevance"),
    category_code: str | None = Query(None),
    price_min: int | None = Query(None),
    price_max: int | None = Query(None),
    legacy: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    search_term = query or q
    if not search_term or not search_term.strip():
        raise HTTPException(status_code=400, detail="검색어를 입력해 주세요")

    search_term = search_term.strip()
    like_pattern = f"%{search_term}%"

    # B1: SQL Injection — legacy mode uses raw SQL string concatenation
    if legacy == "1":
        from sqlalchemy import text as _text
        raw_query = f"SELECT id, goods_no, title, author, publisher, sale_price, cover_image, rating_avg, review_count, sales_index, is_available, publish_date, product_type, original_price, discount_rate FROM products WHERE title LIKE '%{search_term}%' OR author LIKE '%{search_term}%' OR publisher LIKE '%{search_term}%' ORDER BY sales_index DESC LIMIT {size} OFFSET {(page - 1) * size}"
        result = await db.execute(_text(raw_query))
        rows = result.all()
        items = [dict(r._mapping) for r in rows]
        count_query = f"SELECT COUNT(*) FROM products WHERE title LIKE '%{search_term}%' OR author LIKE '%{search_term}%' OR publisher LIKE '%{search_term}%'"
        total = (await db.execute(_text(count_query))).scalar() or 0
        return PaginatedResponse(
            items=items, total=total, page=page, size=size,
            pages=math.ceil(total / size) if total else 0,
        )

    # ILIKE search across title, author, publisher (works with Korean)
    base = select(Product).where(
        or_(
            Product.title.ilike(like_pattern),
            Product.author.ilike(like_pattern),
            Product.publisher.ilike(like_pattern),
        )
    )

    if category_code:
        base = base.where(Product.category_code.startswith(category_code))
    if price_min is not None:
        base = base.where(Product.sale_price >= price_min)
    if price_max is not None:
        base = base.where(Product.sale_price <= price_max)

    # Sort
    if sort in ("popularity", "relevance"):
        base = base.order_by(Product.sales_index.desc())
    elif sort == "newest":
        base = base.order_by(Product.publish_date.desc())
    elif sort == "price_asc":
        base = base.order_by(Product.sale_price.asc())
    elif sort == "price_desc":
        base = base.order_by(Product.sale_price.desc())
    else:
        base = base.order_by(Product.sales_index.desc())

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Facets: publisher
    pub_facet_q = (
        select(Product.publisher, func.count(Product.id).label('cnt'))
        .where(or_(
            Product.title.ilike(like_pattern),
            Product.author.ilike(like_pattern),
            Product.publisher.ilike(like_pattern),
        ))
        .group_by(Product.publisher)
        .order_by(func.count(Product.id).desc())
        .limit(8)
    )
    pub_result = await db.execute(pub_facet_q)
    publishers = [{"name": r[0], "count": r[1]} for r in pub_result.all()]

    # Facets: category
    cat_facet_q = (
        select(Product.category_code, func.count(Product.id).label('cnt'))
        .where(or_(
            Product.title.ilike(like_pattern),
            Product.author.ilike(like_pattern),
            Product.publisher.ilike(like_pattern),
        ))
        .group_by(Product.category_code)
        .order_by(func.count(Product.id).desc())
        .limit(8)
    )
    cat_result = await db.execute(cat_facet_q)
    categories = [{"code": r[0], "count": r[1]} for r in cat_result.all()]

    base = base.offset((page - 1) * size).limit(size)
    result = await db.execute(base)
    items = result.scalars().all()

    return PaginatedResponse(
        items=[ProductListOut.model_validate(p) for p in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
        meta={"facets": {"publishers": publishers, "categories": categories}},
    )


@router.get("/autocomplete")
async def autocomplete(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=20),
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    # Try Redis first
    cached = await redis.zrangebylex(
        "autocomplete", f"[{q}", f"[{q}\xff", start=0, num=limit
    )
    if cached:
        return [c.split("|", 1)[1] if "|" in c else c for c in cached]

    # Fallback to DB ILIKE search
    result = await db.execute(
        select(Product.title)
        .where(Product.title.ilike(f"%{q}%"))
        .order_by(Product.sales_index.desc())
        .limit(limit)
    )
    return [r[0] for r in result.all()]
