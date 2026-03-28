import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
import bcrypt as _bcrypt

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user
from yes24_clone.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile")
async def get_profile(user: User = Depends(require_user)):
    return {
        "id": user.id, "email": user.email, "username": user.username,
        "phone": user.phone, "point_balance": user.point_balance, "grade": user.grade,
    }


@router.put("/profile")
async def update_profile(
    username: str = None, phone: str = None,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if username: user.username = username
    if phone: user.phone = phone
    await db.commit()
    return {"message": "프로필이 수정되었습니다."}


@router.post("/change-password")
async def change_password(
    current_password: str, new_password: str,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if not _bcrypt.checkpw(current_password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다.")
    user.password_hash = _bcrypt.hashpw(new_password.encode(), _bcrypt.gensalt()).decode()
    await db.commit()
    return {"message": "비밀번호가 변경되었습니다."}


@router.get("/addresses")
async def get_addresses(user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        text("SELECT id, label, recipient, phone, zipcode, address1, address2, is_default FROM user_addresses WHERE user_id = :uid ORDER BY is_default DESC, id DESC"),
        {"uid": user.id},
    )
    return [dict(r._mapping) for r in result.all()]


@router.post("/addresses")
async def add_address(
    label: str, recipient: str, phone: str, zipcode: str,
    address1: str, address2: str = "",
    is_default: bool = False,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if is_default:
        await db.execute(text("UPDATE user_addresses SET is_default = FALSE WHERE user_id = :uid"), {"uid": user.id})
    await db.execute(
        text("INSERT INTO user_addresses (user_id, label, recipient, phone, zipcode, address1, address2, is_default) VALUES (:uid, :label, :recipient, :phone, :zipcode, :addr1, :addr2, :is_default)"),
        {"uid": user.id, "label": label, "recipient": recipient, "phone": phone, "zipcode": zipcode, "addr1": address1, "addr2": address2, "is_default": is_default},
    )
    await db.commit()
    return {"message": "주소가 등록되었습니다."}


@router.delete("/addresses/{address_id}")
async def delete_address(address_id: int, user: User = Depends(require_user), db: AsyncSession = Depends(get_db)):
    await db.execute(text("DELETE FROM user_addresses WHERE id = :id AND user_id = :uid"), {"id": address_id, "uid": user.id})
    await db.commit()
    return {"message": "주소가 삭제되었습니다."}


@router.get("/points-history")
async def get_points_history(user: User = Depends(require_user)):
    # Stub: return mock points history
    return [
        {"date": "2026-03-27", "description": "도서 구매 적립", "amount": 500, "balance": user.point_balance},
        {"date": "2026-03-20", "description": "리뷰 작성 적립", "amount": 200, "balance": user.point_balance - 500},
        {"date": "2026-03-15", "description": "가입 축하 포인트", "amount": 5000, "balance": user.point_balance - 700},
    ]
