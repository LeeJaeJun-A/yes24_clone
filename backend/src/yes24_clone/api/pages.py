from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from yes24_clone.db.session import get_db

router = APIRouter(prefix="/pages", tags=["pages"])


@router.get("")
async def list_pages(category: str = None, db: AsyncSession = Depends(get_db)):
    if category:
        result = await db.execute(
            text("SELECT slug, title, category FROM static_pages WHERE category = :cat ORDER BY display_order"),
            {"cat": category},
        )
    else:
        result = await db.execute(
            text("SELECT slug, title, category FROM static_pages ORDER BY category, display_order")
        )
    return [dict(r._mapping) for r in result.all()]


@router.get("/{slug}")
async def get_page(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT slug, title, content, category FROM static_pages WHERE slug = :slug"),
        {"slug": slug},
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="페이지를 찾을 수 없습니다.")
    return dict(row._mapping)
