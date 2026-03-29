# Yes24 Clone v5 - All Improvements

Fix ALL of the following issues. Work systematically, fix each, test, move on.

---

## FIX 1: Book Cover Images (CRITICAL)

DB stores cover_image as "100014874.jpg" but no image server is configured.

Add this helper to frontend/lib/api.ts:
```typescript
export function getCoverUrl(coverImage: string | null | undefined, goodsNo: number): string {
  if (!coverImage || !coverImage.startsWith("http")) {
    return `https://picsum.photos/seed/${goodsNo}/200/280`;
  }
  return coverImage;
}
```

Then grep every .tsx file for cover_image usage and replace with getCoverUrl(product.cover_image, product.goods_no).
Files to check: ProductCard.tsx, Header.tsx, Product/Goods/[id].tsx, Product/Category/BestSeller.tsx, Product/Category/NewProduct.tsx, Product/Category/SteadySeller.tsx, Product/Category/Recommended.tsx, Member/Wishlist.tsx, Member/FTMypageMain.tsx, event/[eventno].tsx, Author/[name].tsx, Publisher/[name].tsx

Also update next.config.js to allow picsum.photos images:
```javascript
images: {
  domains: ['picsum.photos'],
}
```

---

## FIX 2: Product Descriptions

Descriptions are short (~79 chars). Create and run a migration script.

Create file: backend/scripts/fix_descriptions.py
```python
#!/usr/bin/env python3
import asyncio
import random
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://yes24:yes24@localhost:5432/yes24"

topics = ["현대 사회", "인간 심리", "역사의 흐름", "과학의 발전", "철학적 사유", "경제의 원리", "문학의 아름다움", "기술 혁신", "자연과 환경", "인문학적 통찰"]
benefits = ["폭넓은 시각을 갖출", "핵심 개념을 빠르게 습득할", "실무에 바로 적용할 수 있는 지식을", "새로운 관점으로 세상을 바라볼", "깊이 있는 통찰력을 기를"]
targets = ["입문자부터 전문가까지", "이 분야에 관심 있는 모든 독자", "학생과 직장인 모두", "깊이 있는 독서를 즐기는 분들", "실용적인 지식을 원하는 독자"]
additionals = ["저자의 풍부한 경험과 탁월한 통찰이 담긴 역작입니다.", "출간 즉시 독자들의 뜨거운 호응을 받고 있습니다.", "이 책 한 권으로 핵심을 완벽하게 파악할 수 있습니다.", "친절한 설명과 다양한 예시로 쉽게 이해할 수 있습니다.", "독자들의 삶에 실질적인 변화를 가져다 줄 것입니다."]

def gen_desc(title, author):
    topic = random.choice(topics)
    benefit = random.choice(benefits)
    target = random.choice(targets)
    additional = random.choice(additionals)
    years = random.randint(5, 30)
    templates = [
        f"이 책은 {topic}에 대한 깊이 있는 탐구를 담고 있습니다. 저자 {author}는 {years}년간의 연구와 경험을 바탕으로 핵심 개념들을 체계적으로 정리했습니다. 독자들은 이 책을 통해 {benefit} 수 있으며, {target}에게 특히 추천합니다. {additional}",
        f"『{title}』은 {topic}의 본질을 꿰뚫는 통찰력 있는 저작입니다. {author} 저자가 {years}년 이상 연구해온 성과를 집대성한 이 책은, 복잡한 개념을 명쾌하게 풀어냅니다. {target}가 읽어야 할 필독서로, {benefit} 기회를 제공합니다. {additional}",
        f"당신이 {topic}에 대해 알아야 할 모든 것이 담긴 책입니다. {author}는 방대한 자료 조사와 현장 경험을 토대로, 독자들이 {benefit} 수 있도록 친절하게 안내합니다. {target}를 위한 완벽한 가이드북으로, {additional}",
    ]
    return random.choice(templates)

def gen_toc():
    chapters = random.randint(5, 12)
    lines = ["머리말 · " + str(random.randint(3, 10))]
    page = random.randint(15, 25)
    for i in range(1, chapters + 1):
        titles = ["시작하며", "기본 개념", "심화 학습", "실전 적용", "고급 기법", "사례 연구", "미래 전망", "결론", "부록", "참고 자료", "핵심 정리", "실습 문제"]
        title = titles[(i - 1) % len(titles)]
        lines.append(f"제{i}장 {title} · {page}")
        page += random.randint(20, 45)
    lines.append(f"찾아보기 · {page + random.randint(5, 15)}")
    return "\n".join(lines)

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with AsyncSession(engine) as session:
        result = await session.execute(text("SELECT id, title, author FROM products"))
        products = result.fetchall()
        print(f"Updating {len(products)} products...")
        batch = []
        for i, (pid, title, author) in enumerate(products):
            desc = gen_desc(title, author)
            toc = gen_toc()
            batch.append({"id": pid, "desc": desc, "toc": toc})
            if len(batch) >= 500:
                await session.execute(
                    text("UPDATE products SET description = :desc, toc = :toc WHERE id = :id"),
                    batch
                )
                await session.commit()
                print(f"  Updated {i+1}/{len(products)}")
                batch = []
        if batch:
            await session.execute(
                text("UPDATE products SET description = :desc, toc = :toc WHERE id = :id"),
                batch
            )
            await session.commit()
        print("Done!")

asyncio.run(main())
```

Run it: docker exec yes24_clone-backend-1 python /app/scripts/fix_descriptions.py
(Copy script into container first if needed, or run via docker compose exec)

Actually: use docker compose exec to run a python one-liner that does the updates batch by batch directly.

---

## FIX 3: TOC Column Name Mismatch

1. Check backend/src/yes24_clone/models/product.py - find the toc column name
2. Check backend/src/yes24_clone/schemas/product.py - find ProductDetailOut and how toc is mapped
3. If schema uses table_of_contents as field name but DB column is toc, add alias:
   ```python
   table_of_contents: str | None = Field(None, alias=None)
   # or map it:
   @computed_field
   def table_of_contents(self) -> str | None:
       return self.toc
   ```
4. In frontend/pages/Product/Goods/[id].tsx, find where table_of_contents is used and ensure it matches API response field name
5. Fix so 목차 tab shows content

---

## FIX 4: Tag Pages

frontend/pages/Tag/[tag].tsx - read existing stub and rewrite:

```typescript
// getServerSideProps:
const tag = ctx.query.tag as string;
const page = parseInt(ctx.query.page as string) || 1;
const data = await apiFetch(`/products?tag=${encodeURIComponent(tag)}&page=${page}&size=24`, { isServer: true });

// Page shows:
// - Header: #{tag}
// - Product grid using ProductCard
// - Pagination
```

Backend: add tag= param to GET /api/v1/products endpoint:
```python
tag: str | None = Query(None)
# In query:
if tag:
    base = base.where(Product.tags.contains([tag]))
```

---

## FIX 5: Funding Page

Create backend model + endpoint + seed data + frontend page.

Backend model (add to backend/src/yes24_clone/models/):
```python
class Funding(Base):
    __tablename__ = "fundings"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    title = Column(String(500))
    description = Column(Text)
    goal_amount = Column(Integer)  # target funding amount
    current_amount = Column(Integer, default=0)
    backer_count = Column(Integer, default=0)
    start_date = Column(Date)
    end_date = Column(Date)
    is_active = Column(Boolean, default=True)
```

Add to seed: create 15 fundings with Korean titles, random amounts (50-200% funded)

Backend endpoint: GET /api/v1/fundings?page=1&size=20&active=true

Frontend page (frontend/pages/Funding/List.tsx):
- Grid of funding cards
- Each card: cover image, title, author/publisher, progress bar (current/goal %), backer count, days remaining
- 진행중 / 종료 tabs
- "펀딩하기" button (UI only, no real payment)

---

## FIX 6: Company Pages

Rewrite frontend/pages/Company/[slug].tsx with proper content per slug:

```typescript
const CONTENT = {
  about: { title: '회사소개', content: `...` },
  careers: { title: '인재채용', content: `...` },
  terms: { title: '이용약관', content: `...` },
  privacy: { title: '개인정보처리방침', content: `...` },
  'youth-policy': { title: '청소년보호정책', content: `...` },
  'book-promotion': { title: '도서홍보안내', content: `...` },
  'ad-info': { title: '광고안내', content: `...` },
  partnership: { title: '제휴안내', content: `...` },
  'store-info': { title: '매장안내', content: `...` },
};
```

Write realistic Korean content for each. About page should have company history (founded 1999, etc). Terms should have actual terms text (3-4 sections). Privacy policy should look real.

---

## FIX 7: Order Detail Page

Read frontend/pages/Member/OrderDetail/[orderNo].tsx and fix:
- Show complete order info: order number, date, items (with covers via getCoverUrl), shipping address, payment method, amounts
- Add cancel button (calls POST /api/v1/orders/{orderNo}/cancel) if status is 결제완료
- Fix OrderList.tsx: ensure 상세보기 button routes to /Member/OrderDetail/[orderNo]

---

## FIX 8: YES포인트 & Shipping Fee

Cart page (Cart.tsx):
- Shipping: if subtotal >= 15000 → 무료, else → 3000원
- Points earned: Math.floor(subtotal * 0.05) shown as "YES포인트 N점 적립 예정"

Product detail page ([id].tsx):
- Right side: show "YES포인트 N점 (5%)" where N = Math.floor(sale_price * 0.05)
- Show "15,000원 이상 무료배송" badge near price

---

## FIX 9: Search Facets

Update backend/src/yes24_clone/api/search.py search_products function:

After computing results, add facet queries:
```python
# Publisher facets
pub_result = await db.execute(
    select(Product.publisher, func.count(Product.id).label('cnt'))
    .where(or_(
        Product.title.ilike(like_pattern),
        Product.author.ilike(like_pattern),
        Product.publisher.ilike(like_pattern),
    ))
    .group_by(Product.publisher)
    .order_by(func.count(Product.id).desc())
    .limit(8)
)
publishers = [{"name": r[0], "count": r[1]} for r in pub_result.all()]
```

Update response to include facets dict. Update SearchResponse schema. Update frontend Search.tsx filter sidebar to render real publisher/category facets with counts.

---

## FIX 10: Recently Viewed - Guest Support

In frontend/pages/Product/Goods/[id].tsx, add localStorage tracking on mount:
```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    const key = 'yes24_recently_viewed';
    const existing: number[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = [product.goods_no, ...existing.filter(id => id !== product.goods_no)].slice(0, 20);
    localStorage.setItem(key, JSON.stringify(updated));
  }
}, [product.goods_no]);
```

In Header.tsx, add a "최근 본 상품" button in the utility bar that:
- On click, shows a dropdown panel
- Reads from localStorage
- Fetches product info for those goods_nos
- Shows mini cards (cover + title + price)

---

## FIX 11: Login - Verify & Fix

Run these checks:
```
docker exec yes24_clone-postgres-1 psql -U yes24 -d yes24 -c "SELECT email, is_active FROM users LIMIT 5;"
```

Test login:
```
/usr/bin/curl -s -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@yes24.com","password":"password123"}' | python3 -m json.tool
```

If it fails, check backend/src/yes24_clone/api/auth.py for password verification logic. Fix if needed.
Make sure login returns access_token in response.

---

## After All Fixes

Build and deploy:
```
cd ~/Desktop/yes24_clone
docker compose build frontend backend
docker compose up -d
```

Test:
```
/usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost/Product/Goods/100014874
/usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost/Funding/List
/usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost/Company/about
/usr/bin/curl -s "http://localhost/api/v1/search?q=파이썬&page=1&size=5" | python3 -c "import sys,json; d=json.load(sys.stdin); print('total:', d['total'])"
/usr/bin/curl -s -X POST http://localhost/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"test@yes24.com","password":"password123"}' | python3 -c "import sys,json; d=json.load(sys.stdin); print('token:', 'access_token' in d)"
```

Fix any errors. Then run:
openclaw system event --text "Yes24 clone v5 complete - cover images, descriptions, TOC, tag/funding/company pages, order detail, points, shipping, search facets, recently viewed all fixed" --mode now
