"""
Admin panel APIs — intentionally vulnerable for penetration testing.
"""
import subprocess

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import require_user
from yes24_clone.models.user import User
from yes24_clone.models.order import Order
from yes24_clone.models.product import Product

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── B12: Broken access control — client-side admin check ────────────
@router.get("/users")
async def list_users(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """VULNERABLE (B12): Admin check done via X-Admin header — client-side bypass."""
    if request.headers.get("X-Admin") != "true":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(
        select(User).order_by(User.id).limit(100)
    )
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "username": u.username,
            "phone": u.phone,
            "point_balance": u.point_balance,
            "grade": u.grade,
            "is_admin": u.is_admin,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.get("/stats")
async def admin_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """VULNERABLE (B12): Same client-side admin check."""
    if request.headers.get("X-Admin") != "true":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    user_count = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    order_count = (await db.execute(select(func.count()).select_from(Order))).scalar() or 0
    revenue = (await db.execute(
        select(func.coalesce(func.sum(Order.total_amount), 0))
    )).scalar() or 0
    product_count = (await db.execute(select(func.count()).select_from(Product))).scalar() or 0

    return {
        "total_users": user_count,
        "total_orders": order_count,
        "total_revenue": revenue,
        "total_products": product_count,
    }


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """VULNERABLE (B12): Client-side admin check only."""
    if request.headers.get("X-Admin") != "true":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    user.is_active = False
    await db.commit()
    return {"message": f"사용자 {user.username}이(가) 차단되었습니다", "user_id": user_id}


@router.delete("/products/{goods_no}")
async def delete_product(
    goods_no: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """VULNERABLE (B12): Client-side admin check only."""
    if request.headers.get("X-Admin") != "true":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    result = await db.execute(select(Product).where(Product.goods_no == goods_no))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없습니다")

    await db.delete(product)
    await db.commit()
    return {"message": "상품이 삭제되었습니다", "goods_no": goods_no}


# ─── B13: Command Injection via admin logs filter ─────────────────────
@router.get("/logs")
async def admin_logs(
    filter: str = "",
    request: Request = None,
):
    """VULNERABLE (B13): Command injection via filter parameter passed to shell."""
    if request and request.headers.get("X-Admin") != "true":
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")

    # Fake log data + command injection via filter
    fake_logs = [
        "2026-04-01 10:00:00 INFO  [auth] User login: user1@yes24clone.com",
        "2026-04-01 10:05:00 WARN  [auth] Failed login attempt: unknown@test.com",
        "2026-04-01 10:10:00 INFO  [order] New order #ORD-20260401-001 total=35000",
        "2026-04-01 10:15:00 INFO  [product] Product viewed: goods_no=100000001",
        "2026-04-01 10:20:00 ERROR [payment] Payment failed for order #ORD-20260401-002",
        "2026-04-01 10:25:00 INFO  [auth] User logout: user1@yes24clone.com",
        "2026-04-01 10:30:00 INFO  [coupon] Coupon WELCOME10 applied by user_id=1",
        "2026-04-01 10:35:00 WARN  [security] Multiple failed logins from 192.168.1.100",
    ]

    if filter:
        # VULNERABLE: Command injection — filter passed directly to shell
        try:
            log_text = "\n".join(fake_logs)
            result = subprocess.run(
                f"echo '{log_text}' | grep -i '{filter}'",
                shell=True,
                capture_output=True,
                text=True,
                timeout=5,
            )
            filtered = result.stdout.strip().split("\n") if result.stdout.strip() else []
            return {"logs": filtered, "filter": filter, "count": len(filtered)}
        except subprocess.TimeoutExpired:
            return {"logs": [], "filter": filter, "error": "timeout"}
    else:
        return {"logs": fake_logs, "filter": None, "count": len(fake_logs)}
