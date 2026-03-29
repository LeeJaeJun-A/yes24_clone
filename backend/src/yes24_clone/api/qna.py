import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import get_current_user, require_user
from yes24_clone.models.product import Product
from yes24_clone.models.user import User
from yes24_clone.models.qna import ProductQnA
from yes24_clone.schemas.common import PaginatedResponse


class QnAOut(BaseModel):
    id: int
    product_id: int
    user_id: int
    question_title: str
    question_body: str | None = None
    answer_body: str | None = None
    is_answered: bool
    is_secret: bool
    created_at: datetime | None = None
    answered_at: datetime | None = None
    username: str | None = None

    model_config = {"from_attributes": True}


class QnACreateRequest(BaseModel):
    title: str
    body: str
    is_secret: bool = False


router = APIRouter(tags=["qna"])


@router.get("/products/{goods_no}/qna", response_model=PaginatedResponse[QnAOut])
async def list_qna(
    goods_no: int,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_current_user),
):
    prod_result = await db.execute(select(Product.id).where(Product.goods_no == goods_no))
    product_id = prod_result.scalar_one_or_none()
    if product_id is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    query = (
        select(ProductQnA, User.username)
        .join(User, ProductQnA.user_id == User.id)
        .where(ProductQnA.product_id == product_id)
        .order_by(ProductQnA.created_at.desc())
    )

    count_q = select(func.count()).select_from(
        select(ProductQnA).where(ProductQnA.product_id == product_id).subquery()
    )
    total = (await db.execute(count_q)).scalar() or 0

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    rows = result.all()

    items = []
    for qna, username in rows:
        out = QnAOut.model_validate(qna)
        out.username = username
        # Hide body if secret and not owner
        if qna.is_secret and (current_user is None or current_user.id != qna.user_id):
            out.question_body = None
            out.answer_body = None
        items.append(out)

    return PaginatedResponse(
        items=items, total=total, page=page, size=size,
        pages=math.ceil(total / size) if total else 0,
    )


@router.post("/products/{goods_no}/qna")
async def create_qna(
    goods_no: int,
    req: QnACreateRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    prod_result = await db.execute(select(Product.id).where(Product.goods_no == goods_no))
    product_id = prod_result.scalar_one_or_none()
    if product_id is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    qna = ProductQnA(
        product_id=product_id,
        user_id=user.id,
        question_title=req.title,
        question_body=req.body,
        is_secret=req.is_secret,
    )
    db.add(qna)
    await db.commit()
    return {"message": "질문이 등록되었습니다.", "id": qna.id}


@router.get("/products/{goods_no}/qna/count")
async def qna_count(
    goods_no: int,
    db: AsyncSession = Depends(get_db),
):
    prod_result = await db.execute(select(Product.id).where(Product.goods_no == goods_no))
    product_id = prod_result.scalar_one_or_none()
    if product_id is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    count = (await db.execute(
        select(func.count()).where(ProductQnA.product_id == product_id)
    )).scalar() or 0
    return {"count": count}
