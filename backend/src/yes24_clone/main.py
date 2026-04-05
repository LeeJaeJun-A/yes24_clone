import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response, JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from yes24_clone.api import categories, products, search, auth, cart, wishlist, orders, banners
from yes24_clone.api import users, checkout, customer, pages, reviews, qna, fundings, coupons, vuln
from yes24_clone.api import admin

app = FastAPI(
    title="YES24 Clone API",
    version="1.0.0",
    docs_url="/api/swagger",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# B5: X-Debug-Info header on all responses
class DebugHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Debug-Info"] = "yes24-clone/1.0.0; Python/3.11; FastAPI; PostgreSQL; Redis"
        response.headers["X-Powered-By"] = "FastAPI/0.100"
        return response


app.add_middleware(DebugHeaderMiddleware)


# B9: Exception handler returns full stack trace
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exception(type(exc), exc, exc.__traceback__)
    return JSONResponse(
        status_code=500,
        content={
            "error": str(exc),
            "type": type(exc).__name__,
            "traceback": "".join(tb),
            "path": str(request.url),
            "method": request.method,
        },
    )


# Register routes
app.include_router(categories.router, prefix="/api/v1")
app.include_router(products.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(cart.router, prefix="/api/v1")
app.include_router(wishlist.router, prefix="/api/v1")
app.include_router(orders.router, prefix="/api/v1")
app.include_router(banners.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(checkout.router, prefix="/api/v1")
app.include_router(customer.router, prefix="/api/v1")
app.include_router(pages.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(qna.router, prefix="/api/v1")
app.include_router(fundings.router, prefix="/api/v1")
app.include_router(coupons.router, prefix="/api/v1")
app.include_router(vuln.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


# Startup: run migrations for new columns
@app.on_event("startup")
async def run_migrations():
    from yes24_clone.db.session import engine
    from sqlalchemy import text

    # Each DDL in its own transaction to avoid aborted-transaction cascade
    async def safe_exec(sql: str):
        try:
            async with engine.begin() as conn:
                await conn.execute(text(sql))
        except Exception:
            pass

    # Add new columns to users
    await safe_exec("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE")
    await safe_exec("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE")

    # Add new columns to products
    await safe_exec("ALTER TABLE products ADD COLUMN stock_quantity INTEGER DEFAULT 999")
    await safe_exec("ALTER TABLE products ADD COLUMN is_soldout BOOLEAN DEFAULT FALSE")

    # Create coupons table
    await safe_exec("""
        CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            name VARCHAR(200) NOT NULL DEFAULT '',
            discount_type VARCHAR(10) NOT NULL,
            discount_value INTEGER NOT NULL,
            min_order_amount INTEGER NOT NULL DEFAULT 0,
            max_discount INTEGER,
            expires_at TIMESTAMPTZ,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            usage_limit INTEGER NOT NULL DEFAULT 100,
            used_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)

    # Create user_coupons table
    await safe_exec("""
        CREATE TABLE IF NOT EXISTS user_coupons (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            coupon_id INTEGER REFERENCES coupons(id),
            used_at TIMESTAMPTZ,
            order_id INTEGER REFERENCES orders(id)
        )
    """)

    # Seed coupons if empty
    try:
        async with engine.begin() as conn:
            count = await conn.execute(text("SELECT COUNT(*) FROM coupons"))
            if (count.scalar() or 0) == 0:
                coupons_data = [
                    ("WELCOME10", "신규가입 10% 할인", "percent", 10, 10000, 5000, "2027-12-31"),
                    ("SAVE5000", "5000원 할인 쿠폰", "fixed", 5000, 20000, None, "2027-12-31"),
                    ("BOOK20", "도서 20% 할인", "percent", 20, 15000, 10000, "2027-06-30"),
                    ("SPRING2026", "봄맞이 할인", "percent", 15, 10000, 3000, "2026-06-30"),
                    ("SUMMER3000", "여름 3000원 할인", "fixed", 3000, 15000, None, "2026-09-30"),
                    ("FIRST1000", "첫구매 1000원", "fixed", 1000, 5000, None, "2027-12-31"),
                    ("VIP30", "VIP 30% 할인", "percent", 30, 30000, 15000, "2027-12-31"),
                    ("NEWYEAR", "새해 특별 할인", "percent", 25, 20000, 8000, "2027-01-31"),
                    ("REVIEW500", "리뷰 감사 쿠폰", "fixed", 500, 5000, None, "2027-12-31"),
                    ("MEGA50", "메가 50% 할인", "percent", 50, 50000, 25000, "2026-12-31"),
                ]
                for code, name, dtype, value, min_amt, max_disc, exp in coupons_data:
                    max_disc_sql = f"{max_disc}" if max_disc else "NULL"
                    await conn.execute(text(
                        f"INSERT INTO coupons (code, name, discount_type, discount_value, min_order_amount, max_discount, expires_at) "
                        f"VALUES ('{code}', '{name}', '{dtype}', {value}, {min_amt}, {max_disc_sql}, '{exp}'::timestamptz)"
                    ))
    except Exception:
        pass


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/readyz")
async def readyz():
    from yes24_clone.db.session import engine
    async with engine.connect() as conn:
        await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    return {"status": "ready"}


@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots_txt():
    return """User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /Member/
Disallow: /Cart/

Sitemap: http://localhost/sitemap.xml
"""


@app.get("/sitemap.xml")
async def sitemap_xml():
    from sqlalchemy import select
    from yes24_clone.db.session import async_session
    from yes24_clone.models.product import Product
    from yes24_clone.models.category import Category

    urls = [
        '<url><loc>http://localhost/main/default.aspx</loc><priority>1.0</priority></url>',
        '<url><loc>http://localhost/Product/Category/BestSeller</loc><priority>0.9</priority></url>',
    ]

    async with async_session() as db:
        cats = await db.execute(select(Category.code))
        for (code,) in cats.all():
            urls.append(
                f'<url><loc>http://localhost/Product/Category/Display/{code}</loc><priority>0.8</priority></url>'
            )

        prods = await db.execute(select(Product.goods_no).limit(5000))
        for (goods_no,) in prods.all():
            urls.append(
                f'<url><loc>http://localhost/Product/Goods/{goods_no}</loc><priority>0.6</priority></url>'
            )

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{''.join(urls)}
</urlset>"""
    return Response(content=xml, media_type="application/xml")
