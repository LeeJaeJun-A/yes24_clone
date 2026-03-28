import math
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from yes24_clone.db.session import get_db
from yes24_clone.models.category import Category
from yes24_clone.models.product import Product
from yes24_clone.schemas.category import CategoryOut, CategoryTreeOut
from yes24_clone.schemas.product import ProductListOut
from yes24_clone.schemas.common import PaginatedResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[CategoryTreeOut])
async def get_category_tree(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Category).where(Category.is_active == True).order_by(Category.display_order)
    )
    categories = result.scalars().all()

    by_parent: dict[str | None, list] = {}
    for cat in categories:
        by_parent.setdefault(cat.parent_code, []).append(cat)

    def build_tree(parent_code: str | None) -> list[CategoryTreeOut]:
        children = by_parent.get(parent_code, [])
        return [
            CategoryTreeOut(
                **CategoryOut.model_validate(cat).model_dump(),
                children=build_tree(cat.code),
            )
            for cat in children
        ]

    return build_tree(None)


@router.get("/{code}", response_model=CategoryOut)
async def get_category(code: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.code == code))
    cat = result.scalar_one_or_none()
    if not cat:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
    return cat


@router.get("/{code}/products", response_model=PaginatedResponse[ProductListOut])
async def get_category_products(
    code: str,
    page: int = Query(1, ge=1),
    size: int = Query(24, ge=1, le=120),
    sort: str = Query("popularity", regex="^(popularity|newest|price_asc|price_desc|name)$"),
    in_stock: bool = Query(True),
    db: AsyncSession = Depends(get_db),
):
    # Get all subcategory codes under this code
    result = await db.execute(
        select(Category.code).where(Category.code.startswith(code))
    )
    codes = [r[0] for r in result.all()]
    if not codes:
        codes = [code]

    query = select(Product).where(Product.category_code.in_(codes))
    if in_stock:
        query = query.where(Product.is_available == True)

    # Sort
    sort_map = {
        "popularity": Product.sales_index.desc(),
        "newest": Product.publish_date.desc(),
        "price_asc": Product.sale_price.asc(),
        "price_desc": Product.sale_price.desc(),
        "name": Product.title.asc(),
    }
    query = query.order_by(sort_map.get(sort, Product.sales_index.desc()))

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    # Paginate
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedResponse(
        items=[ProductListOut.model_validate(p) for p in items],
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total else 0,
    )
