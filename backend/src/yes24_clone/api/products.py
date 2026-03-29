import math
import json
import textwrap
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import redis.asyncio as aioredis

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import get_redis
from yes24_clone.models.product import Product
from yes24_clone.schemas.product import ProductDetailOut, ProductListOut
from yes24_clone.schemas.common import PaginatedResponse

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=PaginatedResponse[ProductListOut])
async def list_products(
    category_code: str | None = Query(None, alias="categoryCode"),
    author: str | None = Query(None),
    publisher: str | None = Query(None),
    tag: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=120),
    sort: str = Query("salesIndex"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Product).where(Product.is_available == True)
    if category_code:
        query = query.where(Product.category_code.startswith(category_code))
    if author:
        query = query.where(Product.author.ilike(f"%{author}%"))
    if publisher:
        query = query.where(Product.publisher.ilike(f"%{publisher}%"))
    if tag:
        query = query.where(Product.tags.any(tag))

    sort_map = {
        "salesIndex": Product.sales_index.desc(),
        "popularity": Product.sales_index.desc(),
        "newest": Product.publish_date.desc(),
        "price_asc": Product.sale_price.asc(),
        "price_desc": Product.sale_price.desc(),
        "rating": Product.rating_avg.desc(),
    }
    query = query.order_by(sort_map.get(sort, Product.sales_index.desc()))

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


@router.get("/bestseller")
async def get_bestsellers(
    category_code: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    cache_key = f"bestseller:{category_code or 'all'}:{page}:{size}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    query = select(Product).where(Product.is_available == True)
    if category_code:
        query = query.where(Product.category_code.startswith(category_code))
    query = query.order_by(Product.sales_index.desc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    changes = ['NEW', '+3', '+1', '-', '-1', '-2', '-3']
    ranked_items = []
    for idx, p in enumerate(items):
        item = ProductListOut.model_validate(p)
        d = item.model_dump(mode="json")
        d["rank"] = (page - 1) * size + idx + 1
        d["rank_change"] = changes[p.goods_no % 7]
        ranked_items.append(d)

    resp = PaginatedResponse(
        items=ranked_items,
        total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )
    await redis.setex(cache_key, 300, json.dumps(resp.model_dump(mode="json")))
    return resp


@router.get("/new", response_model=list[ProductListOut])
async def get_new_arrivals(
    category_code: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    cache_key = f"new:{category_code or 'all'}:{limit}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    query = select(Product).where(Product.is_available == True)
    if category_code:
        query = query.where(Product.category_code.startswith(category_code))
    query = query.order_by(Product.publish_date.desc()).limit(limit)
    result = await db.execute(query)
    items = [ProductListOut.model_validate(p) for p in result.scalars().all()]
    await redis.setex(cache_key, 300, json.dumps([item.model_dump(mode="json") for item in items]))
    return items


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
    sort: str = Query("newest"),
    db: AsyncSession = Depends(get_db),
):
    sort_map = {
        "newest": Product.publish_date.desc(),
        "sales": Product.sales_index.desc(),
        "price_asc": Product.sale_price.asc(),
        "price_desc": Product.sale_price.desc(),
    }
    query = select(Product).where(Product.author == author).order_by(sort_map.get(sort, Product.publish_date.desc()))
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
    sort: str = Query("newest"),
    db: AsyncSession = Depends(get_db),
):
    sort_map = {
        "newest": Product.publish_date.desc(),
        "sales": Product.sales_index.desc(),
        "price_asc": Product.sale_price.asc(),
        "price_desc": Product.sale_price.desc(),
    }
    query = select(Product).where(Product.publisher == publisher).order_by(sort_map.get(sort, Product.publish_date.desc()))
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


@router.get("/{goods_no}/preview")
async def get_preview(goods_no: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.goods_no == goods_no))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Not found")
    pages = [
        {"page": "표지", "type": "cover", "content": product.title},
        {"page": "목차", "type": "toc", "content": product.toc or "목차 정보가 없습니다."},
        {"page": "4", "type": "text", "content": product.description or "내용 미리보기를 제공하지 않습니다."},
        {"page": "5", "type": "text", "content": "이 책의 내용은 저작권법의 보호를 받습니다. 무단 전재 및 복제를 금합니다."},
    ]
    return {"goods_no": goods_no, "title": product.title, "pages": pages}


@router.get("/{goods_no}/stats")
async def get_product_stats(goods_no: int, db: AsyncSession = Depends(get_db)):
    import random
    rng = random.Random(goods_no)
    age_groups = {
        "10대": rng.randint(5, 20),
        "20대": rng.randint(15, 40),
        "30대": rng.randint(20, 45),
        "40대": rng.randint(10, 30),
        "50대 이상": rng.randint(5, 20),
    }
    total = sum(age_groups.values())
    age_pct = {k: round(v / total * 100) for k, v in age_groups.items()}
    male = rng.randint(30, 70)
    female = 100 - male
    diff = 100 - sum(age_pct.values())
    age_pct["30대"] += diff
    return {
        "goods_no": goods_no,
        "age_distribution": age_pct,
        "gender": {"남성": male, "여성": female},
        "reorder_rate": rng.randint(15, 45),
        "gift_rate": rng.randint(10, 35),
    }


@router.get("/{goods_no}/cover")
async def get_cover(goods_no: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.goods_no == goods_no))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Not found")

    colors = {
        "001": "#2E4057", "002": "#1B4332", "003": "#7B2D8B",
        "004": "#C62828", "005": "#E65100",
    }
    cat_code = (product.category_code or "")[:3]
    bg_color = colors.get(cat_code, "#37474F")

    title_text = product.title[:40] if product.title else "Untitled"
    title_lines = textwrap.wrap(title_text, width=12)
    title_svg = "".join(f'<tspan x="100" dy="1.4em">{line}</tspan>' for line in title_lines)

    author_text = (product.author or "")[:20]
    publisher_text = (product.publisher or "")[:20]

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280">
      <rect width="200" height="280" fill="{bg_color}"/>
      <rect x="10" y="10" width="180" height="260" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="100" y="80" font-family="serif" font-size="16" fill="white" text-anchor="middle" font-weight="bold">{title_svg}</text>
      <line x1="30" y1="190" x2="170" y2="190" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <text x="100" y="210" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.8)" text-anchor="middle">{author_text}</text>
      <text x="100" y="260" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">{publisher_text}</text>
    </svg>"""

    return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})


@router.get("/{goods_no}")
async def get_product(goods_no: int, db: AsyncSession = Depends(get_db), redis: aioredis.Redis = Depends(get_redis)):
    cache_key = f"product:v2:{goods_no}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    result = await db.execute(select(Product).where(Product.goods_no == goods_no))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")
    result_data = ProductDetailOut.model_validate(product)
    d = result_data.model_dump(mode="json")

    # FIX 3: Add format variants
    formats = [{"type": "종이책", "goods_no": product.goods_no, "price": product.sale_price, "active": True}]
    if product.goods_no % 3 != 0:
        formats.append({"type": "eBook", "goods_no": product.goods_no + 50000, "price": int(product.sale_price * 0.7), "active": False})
    if product.goods_no % 10 == 0:
        formats.append({"type": "오디오북", "goods_no": product.goods_no + 90000, "price": int(product.sale_price * 0.8), "active": False})
    d["formats"] = formats

    await redis.setex(cache_key, 120, json.dumps(d))
    return d
