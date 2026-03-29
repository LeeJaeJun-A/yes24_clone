from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response

from yes24_clone.api import categories, products, search, auth, cart, wishlist, orders, banners
from yes24_clone.api import users, checkout, customer, pages, reviews, qna, fundings

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
