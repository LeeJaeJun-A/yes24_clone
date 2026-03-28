import uuid
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import bcrypt as _bcrypt
import redis.asyncio as aioredis

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import get_redis, get_current_user
from yes24_clone.config import settings
from yes24_clone.models.user import User
from yes24_clone.schemas.user import LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not _bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    session_id = str(uuid.uuid4()).replace("-", "")
    await redis.setex(f"session:{session_id}", 86400, str(user.id))

    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        httponly=True,
        max_age=86400,
        path="/",
    )
    return {"message": "로그인 성공", "user": UserOut.model_validate(user)}


@router.post("/register")
async def register(
    body: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 등록된 이메일입니다")

    user = User(
        email=body.email,
        username=body.username,
        password_hash=_bcrypt.hashpw(body.password.encode(), _bcrypt.gensalt()).decode(),
        phone=body.phone,
        point_balance=5000,
        grade="SILVER",
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    session_id = str(uuid.uuid4()).replace("-", "")
    await redis.setex(f"session:{session_id}", 86400, str(user.id))
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        httponly=True,
        max_age=86400,
        path="/",
    )
    return {"message": "회원가입 성공", "user": UserOut.model_validate(user)}


@router.get("/me", response_model=UserOut | None)
async def get_me(user: User | None = Depends(get_current_user)):
    if not user:
        return None
    return UserOut.model_validate(user)


@router.post("/logout")
async def logout(
    response: Response,
    redis: aioredis.Redis = Depends(get_redis),
    user: User | None = Depends(get_current_user),
):
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"message": "로그아웃 완료"}
