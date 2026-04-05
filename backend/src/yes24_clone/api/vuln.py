"""
Intentionally vulnerable endpoints for penetration testing.
DO NOT use in production.
"""
import asyncio
import hashlib
import json
import logging
import os
import pickle
import random
import re
import subprocess
import time

import httpx
from lxml import etree
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from fastapi.responses import HTMLResponse, RedirectResponse, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import redis.asyncio as aioredis

from yes24_clone.db.session import get_db
from yes24_clone.api.deps import get_redis, require_user, get_current_user
from yes24_clone.models.user import User
from yes24_clone.config import settings

logger = logging.getLogger("yes24_clone.vuln")

router = APIRouter(tags=["vuln"])


# ─── B1: SQL Injection ────────────────────────────────────────────────
@router.get("/search/raw")
async def raw_search(q: str = "", db: AsyncSession = Depends(get_db)):
    """VULNERABLE: Raw SQL string concatenation — SQL injection possible."""
    query = f"SELECT id, title, author, publisher, sale_price FROM products WHERE title LIKE '%{q}%' OR author LIKE '%{q}%' LIMIT 50"
    result = await db.execute(text(query))
    rows = result.all()
    return [dict(r._mapping) for r in rows]


@router.get("/users/lookup")
async def user_lookup(username: str = "", db: AsyncSession = Depends(get_db)):
    """VULNERABLE: Raw SQL username lookup — SQL injection possible."""
    query = f"SELECT id, email, username, phone, point_balance, grade, password_hash FROM users WHERE username = '{username}'"
    result = await db.execute(text(query))
    rows = result.all()
    return [dict(r._mapping) for r in rows]


# ─── B3: IDOR ─────────────────────────────────────────────────────────
@router.get("/orders/{order_id}")
async def get_any_order(order_id: int, db: AsyncSession = Depends(get_db)):
    """VULNERABLE: Returns order regardless of ownership — IDOR."""
    result = await db.execute(text(f"SELECT * FROM orders WHERE id = {order_id}"))
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Order not found")
    return dict(row._mapping)


@router.get("/users/{user_id}")
async def get_any_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """VULNERABLE: Full user profile including password_hash — no auth, IDOR + data exposure."""
    result = await db.execute(
        text(f"SELECT id, email, username, phone, point_balance, grade, password_hash, is_admin, created_at FROM users WHERE id = {user_id}")
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row._mapping)


@router.put("/reviews/{review_id}")
async def edit_any_review(review_id: int, content: str = "", rating: int = 5, db: AsyncSession = Depends(get_db)):
    """VULNERABLE: Edit any review without ownership check — IDOR."""
    result = await db.execute(text(f"SELECT id FROM reviews WHERE id = {review_id}"))
    if not result.first():
        raise HTTPException(status_code=404, detail="Review not found")
    await db.execute(
        text(f"UPDATE reviews SET content = '{content}', rating = {rating} WHERE id = {review_id}")
    )
    await db.commit()
    return {"message": "Review updated", "review_id": review_id}


@router.delete("/orders/{order_id}/cancel")
async def cancel_any_order(order_id: int, db: AsyncSession = Depends(get_db)):
    """VULNERABLE: Cancel any order without ownership check — IDOR."""
    await db.execute(text(f"UPDATE orders SET status = 'CANCELLED' WHERE id = {order_id}"))
    await db.commit()
    return {"message": "Order cancelled", "order_id": order_id}


# ─── B5: Sensitive Data Exposure ──────────────────────────────────────
@router.get("/config")
async def get_config():
    """VULNERABLE: Exposes full app configuration including secrets."""
    return {
        "database_url": settings.database_url,
        "redis_url": settings.redis_url,
        "minio_endpoint": settings.minio_endpoint,
        "minio_access_key": settings.minio_access_key,
        "minio_secret_key": settings.minio_secret_key,
        "session_cookie_name": settings.session_cookie_name,
        "debug": settings.debug,
    }


# ─── B6: SSRF ─────────────────────────────────────────────────────────
class FetchCoverRequest(BaseModel):
    url: str


class WebhookRequest(BaseModel):
    callback_url: str
    data: dict = {}


@router.post("/products/fetch-cover")
async def fetch_cover(req: FetchCoverRequest):
    """VULNERABLE: SSRF — fetches any URL server-side with no validation."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(req.url, timeout=10, follow_redirects=True)
    return {
        "status_code": resp.status_code,
        "content_type": resp.headers.get("content-type"),
        "body": resp.text[:10000],
    }


@router.post("/webhooks/notify")
async def webhook_notify(req: WebhookRequest):
    """VULNERABLE: SSRF — POSTs to arbitrary callback URL."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(req.callback_url, json=req.data, timeout=10)
    return {"status_code": resp.status_code, "body": resp.text[:5000]}


# ─── B7: Insecure File Upload ─────────────────────────────────────────
@router.post("/upload/profile-image")
async def upload_profile_image(file: UploadFile = File(...)):
    """VULNERABLE: No file type validation, no size limit, no filename sanitization."""
    from minio import Minio

    content = await file.read()
    minio_client = Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
    )
    bucket = "uploads"
    if not minio_client.bucket_exists(bucket):
        minio_client.make_bucket(bucket)

    import io
    # Filename stored as-is — path traversal possible
    minio_client.put_object(
        bucket, file.filename, io.BytesIO(content), len(content),
        content_type=file.content_type,
    )
    return {
        "message": "File uploaded",
        "filename": file.filename,
        "size": len(content),
        "url": f"http://{settings.minio_endpoint}/{bucket}/{file.filename}",
    }


# ─── B8: Mass Assignment ─────────────────────────────────────────────
@router.put("/users/{user_id}")
async def mass_assign_user(user_id: int, request: Request, db: AsyncSession = Depends(get_db)):
    """VULNERABLE: Accepts any field including is_admin, point_balance — mass assignment."""
    body = await request.json()
    set_clauses = ", ".join(f"{k} = :{k}" for k in body.keys())
    if not set_clauses:
        return {"message": "No fields to update"}
    body["uid"] = user_id
    await db.execute(
        text(f"UPDATE users SET {set_clauses} WHERE id = :uid"),
        body,
    )
    await db.commit()
    return {"message": "User updated", "fields_updated": list(body.keys())}


# ─── B3 extra: Raw HTML reviews (XSS) ────────────────────────────────
@router.get("/products/{goods_no}/reviews/raw", response_class=HTMLResponse)
async def raw_reviews_html(goods_no: int, db: AsyncSession = Depends(get_db)):
    """VULNERABLE: Returns review content as raw HTML — stored XSS."""
    result = await db.execute(
        text(
            "SELECT r.title, r.content, u.username FROM reviews r "
            "JOIN users u ON r.user_id = u.id "
            "JOIN products p ON r.product_id = p.id "
            f"WHERE p.goods_no = {goods_no} LIMIT 50"
        )
    )
    rows = result.all()
    html_parts = ["<html><body><h1>Reviews</h1>"]
    for row in rows:
        html_parts.append(
            f"<div class='review'><h3>{row[0]}</h3><p>by {row[2]}</p><div>{row[1]}</div><hr/></div>"
        )
    html_parts.append("</body></html>")
    return "\n".join(html_parts)


# ─── B10: CSRF — Transfer Points ─────────────────────────────────────
class TransferPointsRequest(BaseModel):
    to_user_id: int
    amount: int


@router.post("/vuln/transfer-points")
async def transfer_points(
    body: TransferPointsRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    """VULNERABLE (B10): No CSRF token, no origin check, samesite=None cookie.
    Points can be transferred via cross-site form submission."""
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="금액은 0보다 커야 합니다")
    if user.point_balance < body.amount:
        raise HTTPException(status_code=400, detail="포인트가 부족합니다")

    from sqlalchemy import select as sa_select
    result = await db.execute(sa_select(User).where(User.id == body.to_user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="대상 사용자를 찾을 수 없습니다")

    user.point_balance -= body.amount
    target.point_balance += body.amount
    await db.commit()

    return {
        "message": "포인트가 전송되었습니다",
        "from_user_id": user.id,
        "to_user_id": target.id,
        "amount": body.amount,
        "remaining_balance": user.point_balance,
    }


# ─── B11: Open Redirect ──────────────────────────────────────────────
@router.get("/vuln/redirect")
async def open_redirect(url: str = ""):
    """VULNERABLE (B11): Redirects to any URL without validation — phishing vector."""
    if not url:
        raise HTTPException(status_code=400, detail="url parameter required")
    return RedirectResponse(url=url)


# ─── B12: Command Injection — Ping ───────────────────────────────────
@router.get("/vuln/ping")
async def vuln_ping(host: str = "127.0.0.1"):
    """VULNERABLE (B12): Command injection via host parameter passed to shell."""
    try:
        result = subprocess.run(
            f"ping -c 1 {host}",
            shell=True,
            capture_output=True,
            text=True,
            timeout=5,
        )
        return {
            "host": host,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"host": host, "error": "timeout"}


# ─── B13: Path Traversal ─────────────────────────────────────────────
@router.get("/vuln/file")
async def path_traversal(path: str = ""):
    """VULNERABLE (B13): Path traversal — reads files outside intended directory."""
    if not path:
        raise HTTPException(status_code=400, detail="path parameter required")
    # VULNERABLE: No sanitization — ../../etc/passwd works
    base_dir = "/app/static"
    file_path = os.path.join(base_dir, path)
    try:
        with open(file_path, "r") as f:
            content = f.read(10000)
        return {"path": path, "content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {path}")
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        return {"path": path, "error": str(e)}


# ─── B14: ReDoS (Regular Expression DoS) ─────────────────────────────
class ValidateEmailRequest(BaseModel):
    email: str


@router.post("/vuln/validate-email")
async def redos_validate_email(body: ValidateEmailRequest):
    """VULNERABLE (B14): Catastrophically backtracking regex — ReDoS possible."""
    # This regex has catastrophic backtracking on inputs like "aaaaaaaaaaaaaaaaaaaaaaaa!"
    evil_pattern = r"^(a+)+$"
    start = time.time()
    match = bool(re.match(evil_pattern, body.email))
    elapsed = time.time() - start
    return {
        "email": body.email,
        "valid": match,
        "processing_time_ms": round(elapsed * 1000, 2),
    }


# ─── B15: JWT None Algorithm ─────────────────────────────────────────
import base64
import hmac

JWT_SECRET = "secret123"  # VULNERABLE: weak secret


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


class JWTLoginRequest(BaseModel):
    username: str
    role: str = "user"


@router.post("/vuln/jwt-login")
async def jwt_login(body: JWTLoginRequest):
    """Issues a JWT with HS256 and weak secret 'secret123'."""
    header = _b64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url_encode(json.dumps({
        "sub": body.username,
        "role": body.role,
        "iat": int(time.time()),
    }).encode())
    signature = _b64url_encode(
        hmac.HMAC(JWT_SECRET.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest()
    )
    token = f"{header}.{payload}.{signature}"
    return {"token": token, "username": body.username, "role": body.role}


@router.get("/vuln/jwt-profile")
async def jwt_profile(request: Request):
    """VULNERABLE (B15): Accepts alg=none — signature bypass possible. Also weak secret."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Bearer token required")

    token = auth[7:]
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=400, detail="Invalid JWT format")

    try:
        header = json.loads(_b64url_decode(parts[0]))
        payload = json.loads(_b64url_decode(parts[1]))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JWT encoding")

    alg = header.get("alg", "HS256")

    # VULNERABLE: accepts alg=none — no signature verification
    if alg.lower() == "none":
        pass  # No verification at all
    elif alg == "HS256":
        expected_sig = _b64url_encode(
            hmac.HMAC(JWT_SECRET.encode(), f"{parts[0]}.{parts[1]}".encode(), hashlib.sha256).digest()
        )
        if parts[2] != expected_sig:
            raise HTTPException(status_code=401, detail="Invalid signature")
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported algorithm: {alg}")

    return {
        "username": payload.get("sub"),
        "role": payload.get("role"),
        "iat": payload.get("iat"),
        "algorithm_used": alg,
    }


# ─── B17: XXE — XML External Entity (CWE-611) ──────────────────────
@router.post("/vuln/xml-parse")
async def xml_parse(request: Request):
    """VULNERABLE (B17): XXE — parses XML with entity resolution enabled."""
    body = await request.body()
    parser = etree.XMLParser(resolve_entities=True, no_network=False)
    try:
        root = etree.fromstring(body, parser=parser)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"XML parse error: {e}")
    return {"tag": root.tag, "text": root.text, "children": {child.tag: child.text for child in root}}


# ─── B18: Insecure Deserialization (CWE-502) ────────────────────────
import base64 as _base64


@router.get("/vuln/cart/export")
async def cart_export():
    """Exports a sample cart as base64-encoded pickle."""
    cart = {"items": [{"goods_no": 100000001, "qty": 1}], "user": "guest"}
    return {"data": _base64.b64encode(pickle.dumps(cart)).decode()}


class CartImportRequest(BaseModel):
    data: str


@router.post("/vuln/cart/import")
async def cart_import(body: CartImportRequest):
    """VULNERABLE (B18): Deserializes arbitrary pickle — RCE possible."""
    raw = _base64.b64decode(body.data)
    cart = pickle.loads(raw)  # noqa: S301  — intentionally vulnerable
    return {"cart": str(cart)}


# ─── B19: Race Condition (CWE-362) ──────────────────────────────────
_redeemed: dict[str, bool] = {}
_balances: dict[str, int] = {}


class CouponRedeemRequest(BaseModel):
    coupon_code: str
    user_id: int = 1


@router.post("/vuln/coupon/redeem")
async def coupon_redeem(body: CouponRedeemRequest):
    """VULNERABLE (B19): Race condition — no atomic check-and-set on coupon redemption."""
    key = f"{body.user_id}:{body.coupon_code}"
    if _redeemed.get(key):
        return {"error": "Coupon already redeemed", "points_added": 0}

    # Simulate slow DB write — race window
    await asyncio.sleep(0.1)

    _redeemed[key] = True
    _balances.setdefault(str(body.user_id), 0)
    _balances[str(body.user_id)] += 5000
    return {"message": "Coupon redeemed!", "points_added": 5000, "balance": _balances[str(body.user_id)]}


class WithdrawRequest(BaseModel):
    user_id: int = 1
    amount: int


@router.post("/vuln/points/withdraw")
async def points_withdraw(body: WithdrawRequest):
    """VULNERABLE (B19): TOCTOU race — balance can go negative."""
    uid = str(body.user_id)
    balance = _balances.get(uid, 10000)

    if balance < body.amount:
        return {"error": "Insufficient balance", "balance": balance}

    # Simulate slow DB write — race window
    await asyncio.sleep(0.05)

    _balances[uid] = balance - body.amount
    return {"message": "Withdrawn", "withdrawn": body.amount, "balance": _balances[uid]}


# ─── B20: Business Logic Bypass (CWE-840) ───────────────────────────
class OrderPlaceRequest(BaseModel):
    goods_no: int = 100000001
    quantity: int = 1
    coupon_discount: float = 0


@router.post("/vuln/order/place")
async def vuln_order_place(body: OrderPlaceRequest):
    """VULNERABLE (B20): No validation on negative quantity/discount — points farming."""
    price_per_unit = 15000  # fixed price for demo
    total = price_per_unit * body.quantity - body.coupon_discount

    result = {
        "goods_no": body.goods_no,
        "quantity": body.quantity,
        "unit_price": price_per_unit,
        "coupon_discount": body.coupon_discount,
        "total": total,
        "status": "PLACED",
    }

    if total < 0:
        result["points_awarded"] = abs(total)
        result["note"] = "Negative total converted to bonus points"

    return result


class PriceCheckRequest(BaseModel):
    goods_no: int = 100000001
    quantity: int = 1


@router.post("/vuln/price-check")
async def vuln_price_check(body: PriceCheckRequest):
    """VULNERABLE (B20): No floor validation, no overflow check."""
    price_per_unit = 15000
    total = price_per_unit * body.quantity
    return {"goods_no": body.goods_no, "quantity": body.quantity, "total": total}


# ─── B21: CRLF / HTTP Header Injection (CWE-113) ────────────────────
@router.get("/vuln/set-lang")
async def set_lang(lang: str = "ko"):
    """VULNERABLE (B21): CRLF injection via lang parameter in response header."""
    resp = Response(content=json.dumps({"language": lang}), media_type="application/json")
    # VULNERABLE: raw value injected into header — CRLF allows arbitrary headers
    resp.headers.append("Content-Language", lang)
    return resp


@router.get("/vuln/redirect-log")
async def redirect_log(url: str = "https://yes24.com"):
    """VULNERABLE (B21): CRLF injection via url parameter in Location header."""
    logger.info(f"Redirect to: {url}")
    resp = Response(content="", status_code=302)
    resp.headers.append("Location", url)
    return resp


# ─── B22: Insecure CORS (CWE-942) ──────────────────────────────────
@router.get("/vuln/cors-test")
async def cors_test(request: Request):
    """VULNERABLE (B22): Wildcard CORS with credentials — any origin reads authenticated data."""
    session_id = request.cookies.get("ASP.NET_SessionId", "anonymous")
    data = {
        "session_id": session_id,
        "user_info": "sensitive-data-here",
        "internal_note": "This should not be readable cross-origin",
    }
    resp = Response(content=json.dumps(data), media_type="application/json")
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Credentials"] = "true"
    return resp


# ─── B23: Insecure Direct Function Reference (CWE-284) ──────────────
_admin_config = {
    "db_host": "postgres",
    "db_port": 5432,
    "redis_host": "redis",
    "secret_key": "supersecret",
    "debug": True,
    "admin_email": "admin@yes24clone.com",
}


async def _action_get_users(db: AsyncSession):
    result = await db.execute(text("SELECT id, email, username, phone, point_balance, grade, is_admin FROM users LIMIT 100"))
    return [dict(r._mapping) for r in result.all()]


async def _action_get_orders(db: AsyncSession):
    result = await db.execute(text("SELECT id, user_id, order_no, total_amount, status FROM orders LIMIT 100"))
    return [dict(r._mapping) for r in result.all()]


async def _action_delete_reviews(db: AsyncSession):
    result = await db.execute(text("SELECT COUNT(*) FROM reviews"))
    count = result.scalar()
    await db.execute(text("DELETE FROM reviews"))
    await db.commit()
    return {"deleted_count": count}


async def _action_reset_points(db: AsyncSession):
    await db.execute(text("UPDATE users SET point_balance = 0"))
    await db.commit()
    return {"message": "All user points reset to 0"}


async def _action_get_config(db: AsyncSession):
    return _admin_config


_ACTIONS = {
    "get_users": _action_get_users,
    "get_orders": _action_get_orders,
    "delete_reviews": _action_delete_reviews,
    "reset_points": _action_reset_points,
    "get_config": _action_get_config,
}


class AdminActionRequest(BaseModel):
    action: str


@router.post("/vuln/admin-action")
async def admin_action(body: AdminActionRequest, db: AsyncSession = Depends(get_db)):
    """VULNERABLE (B23): No auth, action name directly maps to internal functions."""
    fn = _ACTIONS.get(body.action)
    if not fn:
        raise HTTPException(status_code=400, detail=f"Unknown action: {body.action}. Available: {list(_ACTIONS.keys())}")
    result = await fn(db)
    return {"action": body.action, "result": result}


# ─── B24: GraphQL Introspection (CWE-200) ───────────────────────────
_FAKE_SCHEMA = {
    "data": {
        "__schema": {
            "types": [
                {"name": "Query"},
                {"name": "User", "fields": ["id", "email", "username", "passwordHash", "isAdmin", "pointBalance"]},
                {"name": "Order", "fields": ["id", "userId", "orderNo", "totalAmount", "status", "shippingAddress"]},
                {"name": "Product", "fields": ["id", "goodsNo", "title", "costPrice", "salePrice", "stockQuantity"]},
                {"name": "Review", "fields": ["id", "userId", "productId", "rating", "content"]},
                {"name": "Coupon", "fields": ["id", "code", "discountType", "discountValue", "secretNotes"]},
                {"name": "Session", "fields": ["sessionId", "userId", "ipAddress", "createdAt"]},
                {"name": "AdminConfig", "fields": ["dbHost", "dbPort", "secretKey", "debugMode"]},
            ]
        }
    }
}


class GraphQLRequest(BaseModel):
    query: str
    variables: dict = {}


@router.post("/vuln/graphql")
async def fake_graphql(body: GraphQLRequest, db: AsyncSession = Depends(get_db)):
    """VULNERABLE (B24): GraphQL introspection enabled, no auth, exposes sensitive fields."""
    q = body.query.strip()

    # Introspection
    if "__schema" in q or "__type" in q:
        return _FAKE_SCHEMA

    # Fake query: users
    if "users" in q:
        result = await db.execute(
            text("SELECT id, email, username, password_hash, is_admin, point_balance FROM users LIMIT 50")
        )
        users = []
        for r in result.all():
            row = dict(r._mapping)
            row["passwordHash"] = row.pop("password_hash", "")
            row["isAdmin"] = row.pop("is_admin", False)
            row["pointBalance"] = row.pop("point_balance", 0)
            users.append(row)
        return {"data": {"users": users}}

    # Fake query: orders
    if "orders" in q:
        result = await db.execute(
            text("SELECT id, user_id AS \"userId\", order_no AS \"orderNo\", total_amount AS \"totalAmount\", status FROM orders LIMIT 50")
        )
        return {"data": {"orders": [dict(r._mapping) for r in result.all()]}}

    return {"errors": [{"message": "Unknown query"}]}


# ─── B25: Insecure Randomness (CWE-338) ─────────────────────────────
class GenerateCouponRequest(BaseModel):
    user_id: int


@router.post("/vuln/generate-coupon")
async def generate_coupon(body: GenerateCouponRequest):
    """VULNERABLE (B25): Predictable PRNG seeded with user_id."""
    random.seed(body.user_id)
    code = f"COUPON-{random.randint(100000, 999999)}"
    return {"user_id": body.user_id, "coupon_code": code}


@router.get("/vuln/reset-token")
async def reset_token(email: str = ""):
    """VULNERABLE (B25): Only 10000 possible reset tokens — brute-forceable."""
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    token = str(random.randint(0, 9999)).zfill(4)
    return {"email": email, "reset_token": token}


# ─── B26: Log Injection (CWE-117) ───────────────────────────────────
class FeedbackRequest(BaseModel):
    message: str
    user_agent: str = "unknown"


@router.post("/vuln/feedback")
async def vuln_feedback(body: FeedbackRequest):
    """VULNERABLE (B26): Log injection via unsanitized user input in log messages."""
    logger.info(f"Feedback from {body.user_agent}: {body.message}")
    return {"logged": True}


# ─── B27: Timing Attack (CWE-208) ───────────────────────────────────
ADMIN_PASSWORD = "supersecret2024"


class CheckAdminPasswordRequest(BaseModel):
    password: str


@router.post("/vuln/check-admin-password")
async def check_admin_password(body: CheckAdminPasswordRequest):
    """VULNERABLE (B27): Regular string comparison — timing side-channel."""
    # VULNERABLE: == does short-circuit comparison, leaking password length/prefix
    if body.password == ADMIN_PASSWORD:
        return {"valid": True, "message": "Admin access granted"}
    return {"valid": False, "message": "Invalid password"}


# ─── B28: Clickjacking (CWE-1021) ───────────────────────────────────
@router.get("/vuln/iframe-demo", response_class=HTMLResponse)
async def iframe_demo():
    """VULNERABLE (B28): No X-Frame-Options — page can be framed for clickjacking."""
    html = """<!DOCTYPE html>
<html>
<head><title>YES24 Clickjack Demo</title></head>
<body>
<h1>Invisible overlay demo</h1>
<p>The login page is embedded below with no X-Frame-Options protection:</p>
<iframe src="/api/v1/auth/login-page" width="100%" height="400"
        style="opacity:0.3;position:absolute;top:0;left:0;z-index:1;"></iframe>
<button style="position:relative;z-index:0;margin-top:50px;">Click here for a free prize!</button>
</body>
</html>"""
    return HTMLResponse(content=html, headers={"Content-Type": "text/html"})


# ─── B29: HTTP Method Override (CWE-650) ────────────────────────────
_resources: dict[int, dict] = {
    1: {"id": 1, "name": "Resource A", "value": 100},
    2: {"id": 2, "name": "Resource B", "value": 200},
    3: {"id": 3, "name": "Resource C", "value": 300},
}


@router.api_route("/vuln/method-override/resource/{resource_id}", methods=["GET", "POST", "PUT", "DELETE"])
async def method_override_resource(resource_id: int, request: Request):
    """VULNERABLE (B29): X-HTTP-Method-Override header changes effective method — WAF bypass."""
    effective_method = request.headers.get("X-HTTP-Method-Override", request.method).upper()

    if effective_method == "GET":
        res = _resources.get(resource_id)
        if not res:
            raise HTTPException(status_code=404, detail="Resource not found")
        return res
    elif effective_method == "DELETE":
        removed = _resources.pop(resource_id, None)
        return {"message": "Resource deleted", "deleted": removed}
    elif effective_method == "PUT":
        body = await request.json() if request.headers.get("content-length") else {}
        _resources[resource_id] = {"id": resource_id, **body}
        return {"message": "Resource updated", "resource": _resources[resource_id]}
    else:
        return {"method": effective_method, "resource_id": resource_id}


# ─── B30: Mass Enumeration / No Rate Limiting (CWE-770) ─────────────
@router.get("/vuln/user-exists")
async def user_exists(email: str = "", db: AsyncSession = Depends(get_db)):
    """VULNERABLE (B30): User enumeration — different response for existing vs non-existing."""
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    result = await db.execute(text(f"SELECT id FROM users WHERE email = '{email}' LIMIT 1"))
    row = result.first()
    if row:
        return {"exists": True, "email": email}
    raise HTTPException(status_code=404, detail="User not found")


@router.get("/vuln/order-exists")
async def order_exists(order_id: int = 0, db: AsyncSession = Depends(get_db)):
    """VULNERABLE (B30): Order enumeration without auth — no rate limiting."""
    result = await db.execute(text(f"SELECT id, user_id, total_amount FROM orders WHERE id = {order_id}"))
    row = result.first()
    if row:
        return {"exists": True, "order_id": order_id, "details": dict(row._mapping)}
    raise HTTPException(status_code=404, detail="Order not found")
