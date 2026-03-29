# Yes24 Clone v6 - Performance, Data Depth & Polish

Work through each task. Test after each one. Build at the end.

---

## ⚠️ TOP PRIORITY - Do this FIRST before anything else

### Homepage layout must match yes24.com exactly:

The homepage (pages/main/default.tsx) must have this exact two-panel layout:

**LEFT PANEL** (dark sidebar, ~200px wide, dark navy/charcoal background #1a1a3e or similar):
- Vertical list of 8 categories with icons + Korean names:
  - 📚 국내도서  (link to /Product/Category/Display/001)
  - 🌍 외국도서  (link to /Product/Category/Display/002)
  - 📱 eBook     (link to /Product/Category/Display/005)
  - 💿 CD/LP     (link to /Product/Category/Display/003)
  - 📀 DVD/BD    (link to /Product/Category/Display/004)
  - 🎁 문구/GIFT (link to /Product/Category/Display/006)
  - ♻️ 중고샵    (link to /Product/Category/Display/007)
  - 🎟️ 티켓      (link to /Product/Category/Display/008)
- Each item: icon on left, category name on right, white text
- Hover: slight background highlight
- Height: matches the hero banner height

**RIGHT PANEL** (hero banner carousel, fills remaining width):
- Large full-height banner carousel (height ~360px)
- Fetch banners from GET /api/v1/banners
- Each banner: solid gradient background color, centered text:
  - Small subtitle text (e.g. "YES24 추천")
  - Large bold title (e.g. "MD가 선택한 책")
  - Small description text
- Left/right arrow buttons (< >) on sides
- Auto-rotate every 4 seconds
- Dot indicators at bottom

**BELOW THE TWO-PANEL HERO:**
- Category icon grid (horizontal, 8 items in a row):
  - Each: white card with icon + category name below
  - Border: 1px solid #e5e5e5, border-radius: 8px
  - Padding: 16px
  - Icon: use emoji (large, ~32px) or img
  - Name: Korean, 13px, #333
  - Hover: border-color #e51937

The CSS layout for the hero section:
```css
.hero-section {
  display: flex;
  height: 360px;
}
.category-sidebar {
  width: 196px;
  flex-shrink: 0;
  background: #1a1a3e; /* or match real yes24 dark color */
}
.banner-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}
```

Implement this FIRST, build the frontend, verify at http://localhost/main/default.aspx before doing anything else.

---

---

## TASK 1: Performance - Caching & Lazy Loading

### Backend caching with Redis
Add Redis caching to frequently-hit endpoints:

In backend/src/yes24_clone/api/products.py:
- Cache bestseller response: key="bestseller:{category}:{size}", TTL=300s
- Cache category tree: key="categories:tree", TTL=600s
- Cache product detail: key="product:{goods_no}", TTL=120s
- Cache new products: key="new:{category}:{size}", TTL=300s
- Pattern: check Redis first, if miss fetch from DB, store result

```python
import json
cache_key = f"bestseller:{category_code or 'all'}:{size}"
cached = await redis.get(cache_key)
if cached:
    return json.loads(cached)
# ... fetch from DB ...
await redis.setex(cache_key, 300, json.dumps(result))
```

### Frontend lazy loading
In frontend/pages/Product/Goods/[id].tsx:
- Load reviews, Q&A, related products lazily (not in getServerSideProps)
- Show skeleton while loading, fetch on tab click
- This speeds up initial page load significantly

In frontend/pages/main/default.tsx and index.tsx:
- Bestseller/recommended sections: use useEffect to fetch after initial render
- Show skeleton cards during load

### Image lazy loading
In ProductCard.tsx and anywhere book covers appear:
- Add loading="lazy" to all img tags
- Add placeholder blur effect while loading

---

## TASK 2: Seed Data Depth - Reviews Content

Currently reviews exist but content is probably generic. Update review content to be realistic Korean book reviews.

Run this via docker exec against the DB:
```sql
UPDATE reviews SET 
  content = CASE (id % 10)
    WHEN 0 THEN '정말 훌륭한 책입니다. 저자의 통찰력이 돋보이며 읽는 내내 새로운 관점을 얻을 수 있었습니다. 특히 3장의 내용이 인상적이었고, 실생활에 바로 적용할 수 있는 내용들로 가득합니다. 강력 추천합니다!'
    WHEN 1 THEN '기대 이상이었습니다. 처음에는 어려울 것 같았는데 막상 읽어보니 쉽고 재미있게 읽혔어요. 다음 책도 기대됩니다. 배송도 빠르고 책 상태도 좋았습니다.'
    WHEN 2 THEN '평점은 4점입니다. 내용은 좋은데 후반부로 갈수록 조금 지루해지는 감이 있습니다. 하지만 전반적으로 만족스럽고 입문자에게 추천할 만한 책입니다.'
    WHEN 3 THEN '이 분야 최고의 책이라고 생각합니다. 몇 번을 읽어도 새로운 것을 발견하게 되는 깊이 있는 내용. 소장 가치 충분합니다. 친구들에게도 선물했어요.'
    WHEN 4 THEN '솔직히 제목에서 기대한 것보다는 조금 아쉬웠습니다. 내용이 너무 기초적인 부분에 치우쳐 있어서 중급 이상의 독자에게는 다소 지루할 수 있습니다.'
    WHEN 5 THEN '완독하는 데 일주일이 걸렸지만 그만한 가치가 있었습니다. 풍부한 사례와 명확한 설명이 인상적. 직장에서도 바로 써먹을 수 있는 실용적인 내용이 많습니다.'
    WHEN 6 THEN '문장이 아름답고 내용도 깊습니다. 밑줄 치고 싶은 구절들이 너무 많아서 읽는 속도가 느려질 정도였어요. 오랫동안 기억에 남을 책입니다.'
    WHEN 7 THEN '입문서로 최적입니다. 복잡한 개념들을 쉽게 풀어써서 처음 접하는 분들도 이해하기 쉽습니다. 다음 단계 책도 빨리 읽고 싶어졌어요.'
    WHEN 8 THEN '번역이 자연스럽고 내용 구성도 체계적입니다. 원서보다 오히려 이해하기 쉬운 것 같아요. 역자분의 노력이 돋보입니다. 강추!'
    WHEN 9 THEN '기다리던 책이 드디어 나왔네요. 전작도 좋아했는데 이번 책도 역시 기대를 저버리지 않습니다. 저자만의 독특한 시각과 깊이가 느껴집니다.'
  END,
  title = CASE (id % 5)
    WHEN 0 THEN '강력 추천하는 책입니다'
    WHEN 1 THEN '기대 이상이었어요'
    WHEN 2 THEN '전반적으로 만족스럽습니다'
    WHEN 3 THEN '이 분야 필독서'
    WHEN 4 THEN '읽기 좋은 책'
  END
WHERE content IS NULL OR LENGTH(content) < 50;
```

Run via: docker exec yes24_clone-postgres-1 psql -U yes24 -d yes24 -c "UPDATE reviews SET ..."

Also add review titles to reviews that don't have one.

---

## TASK 3: Seed Data Depth - Q&A Answers

Currently Q&As might be unanswered. Add realistic answers:

```sql
UPDATE product_qnas SET
  answer_body = CASE (id % 5)
    WHEN 0 THEN '안녕하세요, YES24 고객센터입니다. 문의해 주신 내용에 대해 답변 드립니다. 해당 상품은 현재 정상적으로 판매 중이며, 주문 후 1-3 영업일 내에 배송됩니다. 추가 문의사항이 있으시면 언제든지 연락 주세요. 감사합니다.'
    WHEN 1 THEN '고객님, 문의 감사합니다. 말씀하신 내용은 해당 도서의 개정판에 모두 반영되어 있습니다. 개정판은 기존 판 대비 30% 이상 내용이 보강되었으니 참고해 주시기 바랍니다.'
    WHEN 2 THEN '네, 해당 도서는 초판과 내용이 동일합니다. 표지 디자인만 변경되었을 뿐 본문 내용에는 차이가 없습니다. 구매에 참고해 주세요.'
    WHEN 3 THEN '안녕하세요. 전자책(eBook) 버전도 별도로 판매 중입니다. 상품 상세페이지에서 eBook 탭을 확인해 주시면 됩니다. 감사합니다.'
    WHEN 4 THEN '고객님 문의 주셔서 감사합니다. 해당 도서는 현재 품절 상태로, 재입고 일정은 미정입니다. 재입고 알림 신청을 해두시면 입고 시 알림을 받으실 수 있습니다.'
  END,
  is_answered = true,
  answered_at = NOW() - (id % 30 || ' days')::interval
WHERE is_answered = false AND id % 3 != 0;
```

---

## TASK 4: More Realistic Book Cover Images

Instead of random picsum photos, generate colored book-cover-style placeholders with:
- The actual title text
- Author name
- A solid background color based on category

Create a new API endpoint: GET /api/v1/products/{goods_no}/cover
That returns an SVG book cover with:
- Background color (based on category_code first 3 chars → color map)
- Title text (truncated to 20 chars, word-wrapped)
- Author text
- Small YES24 watermark
- Publisher name at bottom

```python
@router.get("/{goods_no}/cover")
async def get_cover(goods_no: int, db: AsyncSession = Depends(get_db)):
    product = await get_product_by_goods_no(goods_no, db)
    colors = {
        "001": "#2E4057",  # 국내도서 - dark blue
        "002": "#1B4332",  # 외국도서 - dark green  
        "003": "#7B2D8B",  # 음반 - purple
        "004": "#C62828",  # DVD - red
        "005": "#E65100",  # eBook - orange
    }
    bg_color = colors.get(product.category_code[:3], "#37474F")
    
    title_lines = textwrap.wrap(product.title[:40], width=12)
    title_svg = "\n".join(f'<tspan x="100" dy="1.4em">{line}</tspan>' for line in title_lines)
    
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="200" height="280">
      <rect width="200" height="280" fill="{bg_color}"/>
      <rect x="10" y="10" width="180" height="260" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
      <text x="100" y="80" font-family="serif" font-size="16" fill="white" text-anchor="middle" font-weight="bold">{title_svg}</text>
      <line x1="30" y1="190" x2="170" y2="190" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
      <text x="100" y="210" font-family="sans-serif" font-size="12" fill="rgba(255,255,255,0.8)" text-anchor="middle">{product.author[:20]}</text>
      <text x="100" y="260" font-family="sans-serif" font-size="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">{product.publisher[:20]}</text>
    </svg>"""
    
    return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "public, max-age=86400"})
```

Then update getCoverUrl in frontend/lib/api.ts:
```typescript
export function getCoverUrl(coverImage: string | null | undefined, goodsNo: number): string {
  if (!coverImage || !coverImage.startsWith("http")) {
    return `/api/v1/products/${goodsNo}/cover`;
  }
  return coverImage;
}
```

This gives every book a unique, branded cover with actual title/author text.

---

## TASK 5: Homepage Improvements

Read frontend/pages/main/default.tsx carefully and enhance:

### Real banner carousel
- Fetch banners from API: GET /api/v1/banners
- Each banner: full-width colored gradient with text overlay
- Auto-rotate every 4 seconds
- Dot indicators + prev/next arrows
- Smooth CSS transition

### Category icon grid
- 9 categories in a 3x3 or horizontal scroll grid
- Each: icon (use emoji or simple SVG) + 카테고리명
- Hover: slight scale + color change

### Bestseller section tabs
- Default tab: 종합
- Tabs: 종합 | 국내도서 | 외국도서 | eBook
- On tab click: fetch new data, smooth transition
- Show top 10 with rank numbers

### "Today's Picks" section (MD추천)
- 4 books in a 2x2 grid
- Each with editorial comment (use product.subtitle as comment)

### Flash sale / 오늘의 특가 section
- 4-6 books with countdown timer (24h, purely visual)
- Larger discount badges (20%+)

---

## TASK 6: Product Detail Page Polish

Read frontend/pages/Product/Goods/[id].tsx and enhance:

### Left side improvements
- Book cover: larger (300x420px), with subtle shadow
- Below cover: "이 책이 속한 분야" - category breadcrumb links
- "공유하기" buttons: 카카오톡, 트위터, 링크복사 (UI only)
- "신고하기" small link at bottom

### Right side improvements  
- Badge row: 베스트셀러 N위 (if in top 100), 신간 (if published < 90 days ago), MD추천
- Price section: cleaner layout with strikethrough original price
- Shipping estimate: "오늘 {time} 이전 주문 시 내일({date}) 도착 예정"
- Stock indicator: "재고 있음" green dot or "품절" red

### Tab improvements
- 책소개 tab: use actual description (now 200-400 chars), with "더보기" if >200 chars
- 목차 tab: render toc with proper line breaks, monospace font for page numbers
- 리뷰 tab: show reviewer grade (일반회원, 우수회원) next to name

### 관련상품 section
- "이 책을 구매한 사람들이 함께 구매한 책" (collaborative filtering style - just use same-category books)
- Horizontal scroll carousel with 6 books visible

---

## TASK 7: Search Page Improvements

Read frontend/pages/Product/Search.tsx and enhance:

### Left filter sidebar
- Category filter: show facet counts in parentheses (국내도서 (45))
- Publisher filter: show facet counts, limit to top 8, "더보기" to expand
- Price range: preset buttons (1만원 이하 | 1-2만원 | 2-3만원 | 3만원 이상) + custom range input
- Rating filter: ★4.0 이상 | ★3.0 이상 (radio)
- "필터 초기화" button at top of filter sidebar

### Results area
- Sort bar redesign: tab-style buttons matching yes24.com
- Result count: "총 N건" with bold N
- View toggle: 리스트보기 / 표지보기 icons
- List view: show rank-like row with all info
- Cover view: 4-column grid

### Search suggestions
- Below search bar when no results: "이런 검색어는 어떠세요?" with 5 similar terms
- "최근 검색어" chip list (from localStorage)

---

## TASK 8: Cart Page Polish

Read frontend/pages/Cart/Cart.tsx and enhance:

### Item rows
- Cover image (using getCoverUrl)
- Title + author + publisher
- Price with discount badge
- Quantity stepper (+/- buttons, min 1 max 99)
- Item subtotal (price × qty)
- "나중에 구매" button → move to wishlist
- Delete button (×)

### Empty cart
- Illustration (simple SVG shopping cart icon)
- "장바구니가 비어있습니다" 
- "쇼핑 계속하기" button → /main/default.aspx

### Order summary sidebar
- Sticky on scroll
- 상품금액: Nwon
- 할인금액: -Nwon (red)
- 배송비: 무료 or 3,000원
- 포인트 사용: input (0 ~ user points)
- 쿠폰 적용: dropdown of available coupons
- 구분선
- 최종결제금액: bold, larger font, red color
- YES포인트 적립 예정: N점
- "주문하기" large red button

---

## TASK 9: MyPage Dashboard

Read frontend/pages/Member/FTMypageMain.tsx and enhance:

### Stats cards (4 in a row)
- 주문: N건 (last 6 months)
- 취소/반품: N건
- 위시리스트: N개
- 쿠폰: N장

### Recent orders table
- Last 5 orders
- Columns: 주문일, 상품정보(cover+title), 주문금액, 주문상태
- Status badges with colors

### 최근 본 상품
- Horizontal scroll, 5 books
- "전체보기" link → /Member/RecentlyViewed

### 나의 활동
- 내가 쓴 리뷰: N개
- 내가 쓴 Q&A: N개
- 받은 도움이돼요: N개

---

## TASK 10: Footer Improvements

Read frontend/components/layout/Footer.tsx and enhance to match yes24.com footer exactly:

### Top section
- 4 columns: 고객센터, 이용안내, 회사소개, SNS
- 고객센터: phone numbers, hours
- 이용안내: links to terms, privacy, youth policy
- 회사소개: about, careers, advertising
- SNS: kakao, instagram, facebook, youtube icons

### Middle section  
- Payment method icons: 신용카드, 무통장, 카카오페이, 네이버페이, 토스 (simple text badges)
- Security certifications: 개인정보보호, SSL 인증 (text badges)

### Bottom section
- Company info: 예스이십사(주) CEO, address, business registration
- Copyright
- "이 사이트는 보안 테스트용 클론입니다" small disclaimer

---

## BUILD & TEST

After all tasks:
```
cd ~/Desktop/yes24_clone
docker compose build frontend backend
docker compose up -d
```

Test:
```
/usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost/main/default.aspx
/usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost/Product/Goods/100014874
/usr/bin/curl -s "http://localhost/api/v1/products/100014874/cover" | head -5
/usr/bin/curl -s "http://localhost/api/v1/products/bestseller?size=5" | /usr/bin/python3 -c "import sys,json; d=json.load(sys.stdin); print('ok, items:', len(d['items']))"
```

Fix any errors. Then done.
