import math
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from yes24_clone.db.session import get_db
from yes24_clone.models.funding import Funding
from yes24_clone.models.product import Product

router = APIRouter(prefix="/fundings", tags=["fundings"])


@router.get("")
async def list_fundings(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    active: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    query = select(Funding)
    if active:
        query = query.where(Funding.is_active == True, Funding.end_date >= date.today())
    else:
        query = query.where(Funding.end_date < date.today())
    query = query.order_by(Funding.end_date.asc())

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    fundings = result.scalars().all()

    # Get associated product info
    product_ids = [f.product_id for f in fundings if f.product_id]
    products_map = {}
    if product_ids:
        prod_result = await db.execute(
            select(Product).where(Product.id.in_(product_ids))
        )
        for p in prod_result.scalars().all():
            products_map[p.id] = p

    items = []
    for f in fundings:
        prod = products_map.get(f.product_id)
        days_remaining = (f.end_date - date.today()).days if f.end_date else 0
        items.append({
            "id": f.id,
            "title": f.title,
            "description": f.description,
            "goal_amount": f.goal_amount,
            "current_amount": f.current_amount,
            "backer_count": f.backer_count,
            "start_date": str(f.start_date) if f.start_date else None,
            "end_date": str(f.end_date) if f.end_date else None,
            "is_active": f.is_active,
            "days_remaining": max(0, days_remaining),
            "progress": round(f.current_amount / f.goal_amount * 100) if f.goal_amount else 0,
            "product": {
                "goods_no": prod.goods_no,
                "title": prod.title,
                "author": prod.author,
                "publisher": prod.publisher,
                "cover_image": prod.cover_image,
                "sale_price": prod.sale_price,
            } if prod else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "size": size,
        "pages": math.ceil(total / size) if total else 0,
    }
