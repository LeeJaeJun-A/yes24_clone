from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from yes24_clone.db.session import get_db
from yes24_clone.models.banner import Banner
from yes24_clone.models.event import Event
from yes24_clone.schemas.user import BannerOut, EventOut

router = APIRouter(tags=["banners"])


@router.get("/banners", response_model=list[BannerOut])
async def get_banners(
    slot: str = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Banner).where(Banner.is_active == True).order_by(Banner.display_order)
    if slot:
        query = query.where(Banner.slot == slot)
    result = await db.execute(query)
    return [BannerOut.model_validate(b) for b in result.scalars().all()]


@router.get("/events", response_model=list[EventOut])
async def get_events(
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Event).order_by(Event.created_at.desc())
    if status == "active":
        query = query.where(Event.is_active == True)
    elif status == "ended":
        query = query.where(Event.is_active == False)
    result = await db.execute(query)
    return [EventOut.model_validate(e) for e in result.scalars().all()]


@router.get("/events/{event_no}", response_model=EventOut)
async def get_event(event_no: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Event).where(Event.event_no == event_no))
    event = result.scalar_one_or_none()
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="이벤트를 찾을 수 없습니다")
    return EventOut.model_validate(event)
