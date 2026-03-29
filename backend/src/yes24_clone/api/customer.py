from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user, get_current_user
from yes24_clone.models.user import User

router = APIRouter(prefix="/customer", tags=["customer"])


@router.get("/faq")
async def get_faq(
    category: str | None = Query(None),
    q: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    params = {}
    if category:
        query = text("SELECT id, category, question, answer, display_order FROM faq_items WHERE is_active = TRUE AND category = :cat ORDER BY display_order")
        params["cat"] = category
    elif q:
        query = text("SELECT id, category, question, answer, display_order FROM faq_items WHERE is_active = TRUE AND (question ILIKE :q OR answer ILIKE :q) ORDER BY display_order")
        params["q"] = f"%{q}%"
    else:
        query = text("SELECT id, category, question, answer, display_order FROM faq_items WHERE is_active = TRUE ORDER BY display_order")
    result = await db.execute(query, params)
    return [dict(r._mapping) for r in result.all()]


@router.get("/faq/categories")
async def get_faq_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT DISTINCT category FROM faq_items WHERE is_active = TRUE ORDER BY category"))
    return [r[0] for r in result.all()]


@router.post("/tickets")
async def create_ticket(
    category: str, subject: str, content: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        text("INSERT INTO customer_tickets (user_id, category, subject, content) VALUES (:uid, :cat, :sub, :content)"),
        {"uid": user.id, "cat": category, "sub": subject, "content": content},
    )
    await db.commit()
    return {"message": "문의가 접수되었습니다. 빠른 시일 내에 답변 드리겠습니다."}


@router.get("/tickets")
async def get_tickets(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, category, subject, status, created_at FROM customer_tickets WHERE user_id = :uid ORDER BY created_at DESC"),
        {"uid": user.id},
    )
    return [dict(r._mapping) for r in result.all()]
