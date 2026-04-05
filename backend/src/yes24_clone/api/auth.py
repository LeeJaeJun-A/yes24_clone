import uuid
import hashlib
import time
import secrets
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import bcrypt as _bcrypt
import redis.asyncio as aioredis

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import get_redis, get_current_user, require_user
from yes24_clone.config import settings
from yes24_clone.models.user import User
from yes24_clone.models.order import Order
from yes24_clone.schemas.user import LoginRequest, RegisterRequest, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _calculate_grade(total_spent: int) -> str:
    if total_spent >= 300000:
        return "로열"
    elif total_spent >= 100000:
        return "프리미엄"
    elif total_spent >= 30000:
        return "우수"
    return "일반"


async def _get_total_spent(db: AsyncSession, user_id: int) -> int:
    result = await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.user_id == user_id)
    )
    return result.scalar() or 0


# ─── B4: No rate limiting, no account lockout ─────────────────────────
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

    if not user.is_active:
        raise HTTPException(status_code=403, detail="탈퇴한 계정입니다")

    session_id = str(uuid.uuid4()).replace("-", "")

    # Remember me: 30 days vs 1 day
    ttl = 2592000 if body.remember_me else 86400
    await redis.setex(f"session:{session_id}", ttl, str(user.id))

    # B4: Cookie with secure=False, samesite=None
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        httponly=True,
        secure=False,
        samesite="none",
        max_age=ttl,
        path="/",
    )

    # Return grade from order history
    total_spent = await _get_total_spent(db, user.id)
    grade = _calculate_grade(total_spent)

    user_data = UserOut.model_validate(user).model_dump(mode="json")
    user_data["grade"] = grade
    user_data["total_spent"] = total_spent

    return {"message": "로그인 성공", "access_token": session_id, "user": user_data}


# B8: Mass assignment — accept is_admin in registration body
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

    # B2: XSS — username NOT sanitized
    # B8: Mass assignment — is_admin accepted from body
    user = User(
        email=body.email,
        username=body.username,  # No sanitization — stored XSS possible
        password_hash=_bcrypt.hashpw(body.password.encode(), _bcrypt.gensalt()).decode(),
        phone=body.phone,
        point_balance=5000,
        grade="SILVER",
        is_admin=getattr(body, "is_admin", False),
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
        secure=False,
        samesite="none",
        max_age=86400,
        path="/",
    )
    return {"message": "회원가입 성공", "user": UserOut.model_validate(user)}


@router.get("/me")
async def get_me(user: User | None = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not user:
        return None
    d = UserOut.model_validate(user).model_dump(mode="json")
    total_spent = await _get_total_spent(db, user.id)
    d["grade"] = _calculate_grade(total_spent)
    d["total_spent"] = total_spent
    return d


@router.post("/logout")
async def logout(
    response: Response,
    redis: aioredis.Redis = Depends(get_redis),
    user: User | None = Depends(get_current_user),
):
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"message": "로그아웃 완료"}


# ─── Phase A: check-email ─────────────────────────────────────────────
class CheckEmailRequest(BaseModel):
    email: str


@router.post("/check-email")
async def check_email(body: CheckEmailRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    exists = result.scalar_one_or_none() is not None
    return {"available": not exists}


# ─── Phase A: change-password ─────────────────────────────────────────
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    if not _bcrypt.checkpw(body.current_password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않습니다")
    user.password_hash = _bcrypt.hashpw(body.new_password.encode(), _bcrypt.gensalt()).decode()
    await db.commit()
    return {"message": "비밀번호가 변경되었습니다"}


# ─── Phase A: withdraw (soft-delete) ──────────────────────────────────
@router.delete("/withdraw")
async def withdraw(
    response: Response,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    user.is_active = False
    await db.commit()
    response.delete_cookie(settings.session_cookie_name, path="/")
    return {"message": "회원 탈퇴가 완료되었습니다"}


# ─── B11: Password Reset — token returned in response (info disclosure) ─
class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """VULNERABLE (B11): Reset token returned directly in response instead of being sent via email."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="등록되지 않은 이메일입니다")

    token = secrets.token_urlsafe(32)
    await redis.setex(f"reset:{token}", 900, str(user.id))  # 15min TTL

    # VULNERABLE: token should be sent via email, not returned in response
    return {
        "message": "비밀번호 재설정 토큰이 발급되었습니다",
        "reset_token": token,
        "expires_in": 900,
    }


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    user_id = await redis.get(f"reset:{body.token}")
    if not user_id:
        raise HTTPException(status_code=400, detail="유효하지 않거나 만료된 토큰입니다")

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    user.password_hash = _bcrypt.hashpw(body.new_password.encode(), _bcrypt.gensalt()).decode()
    await db.commit()
    await redis.delete(f"reset:{body.token}")
    return {"message": "비밀번호가 재설정되었습니다"}


# ─── Social Login Mock ───────────────────────────────────────────────
class SocialLoginRequest(BaseModel):
    access_token: str


async def _social_login(
    provider: str,
    access_token: str,
    response: Response,
    db: AsyncSession,
    redis: aioredis.Redis,
):
    """Mock social login — always succeeds, creates/finds user."""
    email = f"{provider}_{access_token[:8]}@{provider}.com"
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            email=email,
            username=f"{provider}_{access_token[:8]}",
            password_hash=_bcrypt.hashpw(b"social_placeholder", _bcrypt.gensalt()).decode(),
            phone=None,
            point_balance=3000,
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
        secure=False,
        samesite="none",
        max_age=86400,
        path="/",
    )
    return {
        "message": f"{provider} 로그인 성공",
        "access_token": session_id,
        "user": UserOut.model_validate(user).model_dump(mode="json"),
    }


@router.post("/social/kakao")
async def social_kakao(
    body: SocialLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    return await _social_login("kakao", body.access_token, response, db, redis)


@router.post("/social/naver")
async def social_naver(
    body: SocialLoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    return await _social_login("naver", body.access_token, response, db, redis)


# ─── Email Verification Mock ─────────────────────────────────────────
class SendVerificationRequest(BaseModel):
    email: str


class VerifyEmailRequest(BaseModel):
    email: str
    code: str


@router.post("/send-verification")
async def send_verification(
    body: SendVerificationRequest,
    redis: aioredis.Redis = Depends(get_redis),
):
    """VULNERABLE (B11): Verification code returned directly instead of sent via email."""
    import random
    code = str(random.randint(100000, 999999))
    await redis.setex(f"verify:{body.email}", 300, code)  # 5min TTL

    # VULNERABLE: code should be sent via email, not returned in response
    return {
        "message": "인증 코드가 발송되었습니다",
        "verification_code": code,
        "expires_in": 300,
    }


@router.post("/verify-email")
async def verify_email(
    body: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    stored_code = await redis.get(f"verify:{body.email}")
    if not stored_code or stored_code != body.code:
        raise HTTPException(status_code=400, detail="유효하지 않은 인증 코드입니다")

    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user:
        # Mark verified (using grade field as proxy since no dedicated column)
        await redis.set(f"verified:{body.email}", "1")

    await redis.delete(f"verify:{body.email}")
    return {"message": "이메일이 인증되었습니다", "verified": True}


# ─── B4: Debug session — information disclosure ───────────────────────
@router.get("/debug-session")
async def debug_session(
    session_id: str = "",
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    """VULNERABLE: Returns user info for any session ID — information disclosure."""
    user_id = await redis.get(f"session:{session_id}")
    if not user_id:
        return {"error": "Session not found"}
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        return {"error": "User not found"}
    return {
        "session_id": session_id,
        "user_id": user.id,
        "email": user.email,
        "username": user.username,
        "is_admin": user.is_admin,
        "grade": user.grade,
        "point_balance": user.point_balance,
    }


# ─── B4: Admin login with hardcoded credentials ──────────────────────
class AdminLoginRequest(BaseModel):
    username: str
    password: str


@router.post("/admin-login")
async def admin_login(
    body: AdminLoginRequest,
    response: Response,
    redis: aioredis.Redis = Depends(get_redis),
    db: AsyncSession = Depends(get_db),
):
    """VULNERABLE: Hardcoded admin credentials admin/admin123."""
    if body.username == "admin" and body.password == "admin123":
        # Find or create admin user
        result = await db.execute(select(User).where(User.email == "admin@yes24.com"))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                email="admin@yes24.com",
                username="관리자",
                password_hash=_bcrypt.hashpw(b"admin123", _bcrypt.gensalt()).decode(),
                is_admin=True,
                point_balance=0,
                grade="ADMIN",
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)

        session_id = str(uuid.uuid4()).replace("-", "")
        await redis.setex(f"session:{session_id}", 86400, str(admin.id))
        response.set_cookie(
            key=settings.session_cookie_name,
            value=session_id,
            httponly=True,
            secure=False,
            samesite="none",
            max_age=86400,
            path="/",
        )
        return {"message": "Admin login success", "access_token": session_id, "is_admin": True}
    raise HTTPException(status_code=401, detail="Invalid admin credentials")


# ─── B4: List ALL active sessions ────────────────────────────────────
@router.get("/sessions")
async def list_all_sessions(redis: aioredis.Redis = Depends(get_redis)):
    """VULNERABLE: Lists all active sessions — admin info disclosure."""
    keys = []
    async for key in redis.scan_iter("session:*"):
        user_id = await redis.get(key)
        ttl = await redis.ttl(key)
        keys.append({"session_id": key.replace("session:", ""), "user_id": user_id, "ttl_seconds": ttl})
    return {"total_sessions": len(keys), "sessions": keys}


# ─── B10: Weak session — MD5(email+timestamp) ────────────────────────
@router.post("/login-weak")
async def login_weak(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
):
    """VULNERABLE: Uses MD5(email+timestamp) as session ID — predictable."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not _bcrypt.checkpw(body.password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다")

    timestamp = str(int(time.time()))
    session_id = hashlib.md5(f"{body.email}{timestamp}".encode()).hexdigest()
    await redis.setex(f"session:{session_id}", 86400, str(user.id))

    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_id,
        httponly=True,
        secure=False,
        samesite="none",
        max_age=86400,
        path="/",
    )
    return {"message": "로그인 성공 (weak)", "access_token": session_id, "user": UserOut.model_validate(user)}


# ─── B10: Token preview — timing attack ──────────────────────────────
@router.get("/token-preview")
async def token_preview(email: str = ""):
    """VULNERABLE: Shows what the next session token would be — timing attack."""
    timestamp = str(int(time.time()))
    token = hashlib.md5(f"{email}{timestamp}".encode()).hexdigest()
    return {"email": email, "timestamp": timestamp, "predicted_token": token}
