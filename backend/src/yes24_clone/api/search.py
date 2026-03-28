import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
import redis.asyncio as aioredis

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import get_redis
from yes24_clone.models.product import Product
from yes24_clone.schemas.product import ProductListOut
from yes24_clone.schemas.common import PaginatedResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=PaginatedResponse[ProductListOut])
async def search_products(
    query: str = Query(..., min_length=1, alias="query"),
    domain: str = Query("ALL"),
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=120),
    sort: str = Query("relevance"),
    category_code: str | None = Query(None),
    price_min: int | None = Query(None),
    price_max: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    ts_query = func.plainto_tsquery("simple", query)
    search_vector = func.to_tsvector(
        "simple",
        func.coalesce(Product.title, "") + " " +
        func.coalesce(Product.author, "") + " " +
        func.coalesce(Product.publisher, "")
    )

    base = select(Product).where(search_vector.op("@@")(ts_query))

    if category_code:
        base = base.where(Product.category_code.startswith(category_code))
    if price_min is not None:
        base = base.where(Product.sale_price >= price_min)
    if price_max is not None:
        base = base.where(Product.sale_price <= price_max)

    # Sort
    if sort == "popularity":
        base = base.order_by(Product.sales_index.desc())
    elif sort == "newest":
        base = base.order_by(Product.publish_date.desc())
    elif sort == "price_asc":
        base = base.order_by(Product.sale_price.asc())
    elif sort == "price_desc":
        base = base.order_by(Product.sale_price.desc())
    else:
        # relevance - use ts_rank
        base = base.order_by(
            func.ts_rank(search_vector, ts_query).desc()
        )

    count_q = select(func.count()).select_from(base.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    base = base.offset((page - 1) * size).limit(size)
    result = await db.execute(base)
    items = result.scalars().all()

    return PaginatedResponse(
        items=[ProductListOut.model_validate(p) for p in items],
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
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

    # Fallback to DB trigram search
    result = await db.execute(
        select(Product.title)
        .where(Product.title.ilike(f"%{q}%"))
        .order_by(Product.sales_index.desc())
        .limit(limit)
    )
    return [r[0] for r in result.all()]
