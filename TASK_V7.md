# Yes24 Clone v7 - Functional Improvements

Fix the 6 functional gaps vs real yes24.com. No visual polish — pure functionality.

---

## FIX 1: 베스트셀러 순위 변동 표시

Real yes24 shows rank numbers prominently + rank change indicators.

### Backend
Add rank_change field to bestseller response. In backend/src/yes24_clone/api/products.py bestseller endpoint:
- Add a rank_change field: simulate with deterministic calculation based on goods_no
  ```python
  # Simulate rank change: use goods_no % 7 to vary
  changes = ['NEW', '+3', '+1', '-', '-1', '-2', '-3']
  rank_change = changes[product.goods_no % 7]
  ```
- Add rank_change to ProductListOut schema or return as extra field in bestseller response
- Response items should include: rank (1-based position), rank_change string

### Frontend - BestSeller page (pages/Product/Category/BestSeller.tsx)
- Show large rank number (1, 2, 3...) on each item
- Show rank change badge next to rank:
  - 'NEW' → red badge "NEW"
  - '+N' → green with ▲N
  - '-N' → red with ▼N  
  - '-' → gray "-" (no change)
- Top 3: gold(1), silver(2), bronze(3) rank number colors
- Same in homepage bestseller section (main/default.tsx)

### Frontend - Homepage bestseller section
- Add rank number + change indicator to each book in the bestseller tabs

---

## FIX 2: 상품 상세 미리보기 (책 내부 미리보기)

Real yes24 shows actual book preview pages. We'll simulate with realistic content.

### Backend
Add preview endpoint: GET /api/v1/products/{goods_no}/preview
- Returns 3-5 "preview pages" as text content (simulate book pages)
- Generate from product description + toc:
  ```python
  @router.get("/{goods_no}/preview")
  async def get_preview(goods_no: int, db: AsyncSession = Depends(get_db)):
      product = await get_product_by_goods_no(goods_no, db)
      pages = [
          {"page": "표지", "type": "cover", "content": product.title},
          {"page": "목차", "type": "toc", "content": product.toc or "목차 정보가 없습니다."},
          {"page": "4", "type": "text", "content": product.description or "내용 미리보기를 제공하지 않습니다."},
          {"page": "5", "type": "text", "content": "이 책의 내용은 저작권법의 보호를 받습니다. 무단 전재 및 복제를 금합니다."},
      ]
      return {"goods_no": goods_no, "title": product.title, "pages": pages}
  ```

### Frontend - Product Detail (pages/Product/Goods/[id].tsx)
- "미리보기" button: on click, open a modal
- Modal shows:
  - Prev/Next page navigation buttons
  - Page content rendered (cover shows book title in styled box, toc shows formatted toc, text pages show content)
  - Page indicator "1 / 4"
  - Close button (X)
  - Overlay background
- Fetch preview data from API when modal opens (lazy)
- Modal CSS: fixed overlay, centered white box 600px wide, max-height 80vh

---

## FIX 3: 종이책/eBook/오디오북 탭

Real yes24 product detail shows tabs for different formats of the same book.

### Backend
Add format variants to product detail response. In GET /api/v1/products/{goods_no}:
- Add field: formats: list of available formats with their goods_no and price
- Simulate: most books have only 종이책, ~30% also have eBook (goods_no + 50000), ~10% have 오디오북
  ```python
  formats = [{"type": "종이책", "goods_no": product.goods_no, "price": product.sale_price, "active": True}]
  if product.goods_no % 3 != 0:  # 67% have eBook
      formats.append({"type": "eBook", "goods_no": product.goods_no + 50000, "price": int(product.sale_price * 0.7), "active": False})
  if product.goods_no % 10 == 0:  # 10% have audio
      formats.append({"type": "오디오북", "goods_no": product.goods_no + 90000, "price": int(product.sale_price * 0.8), "active": False})
  ```
- Return formats in product detail response

### Frontend - Product Detail
- Add format tab buttons below the title:
  ```
  [종이책 ₩13,500] [eBook ₩9,450] [오디오북 ₩10,800]
  ```
- Active tab: highlighted (border-bottom or background)
- Clicking eBook/오디오북 tab: update displayed price, show "(전자책)" or "(오디오)" badge
- Keep same page, just toggle price/format display

---

## FIX 4: 배송 예정일 실시간 계산

Real yes24 shows: "오늘 오후 2시 이전 주문 시 내일(화) 도착 예정"

### Frontend - Product Detail (pages/Product/Goods/[id].tsx)
Add a DeliveryEstimate component that calculates client-side:

```typescript
function DeliveryEstimate() {
  const now = new Date();
  const hour = now.getHours();
  const cutoff = 14; // 2pm cutoff
  
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  
  let deliveryDate: Date;
  let message: string;
  
  if (hour < cutoff) {
    // Order today → arrives tomorrow (skip Sunday)
    deliveryDate = new Date(now);
    deliveryDate.setDate(deliveryDate.getDate() + 1);
    if (deliveryDate.getDay() === 0) deliveryDate.setDate(deliveryDate.getDate() + 1); // skip Sunday
    message = `오늘 오후 ${cutoff}시 이전 주문 시`;
  } else {
    // Order tomorrow → arrives day after
    deliveryDate = new Date(now);
    deliveryDate.setDate(deliveryDate.getDate() + 2);
    if (deliveryDate.getDay() === 0) deliveryDate.setDate(deliveryDate.getDate() + 1);
    message = `내일 오후 ${cutoff}시 이전 주문 시`;
  }
  
  const month = deliveryDate.getMonth() + 1;
  const date = deliveryDate.getDate();
  const day = days[deliveryDate.getDay()];
  
  return (
    <div style={{ fontSize: 12, color: '#555', marginTop: 8, padding: '8px 12px', background: '#f0f7ff', borderRadius: 3, borderLeft: '3px solid #0080ff' }}>
      <span style={{ color: '#0080ff', fontWeight: 600 }}>빠른 배송</span>
      {' '}{message}{' '}
      <strong style={{ color: '#333' }}>{month}월 {date}일({day}) 도착 예정</strong>
    </div>
  );
}
```

Use `useEffect` + `useState` to avoid SSR mismatch (render only on client).

Place this component in the product detail right panel, below the price section.

Also add to Cart page: "결제 시 배송 예정일" in the order summary.

---

## FIX 5: 회원 등급 시스템

Real yes24 has: 일반 → 우수 → 프리미엄 → 로열 grades with benefits.

### Backend
Add grade calculation to user. In backend/src/yes24_clone/api/auth.py or users.py:
- GET /api/v1/auth/me response should include grade based on total order amount:
  ```python
  # Calculate grade from total orders
  total_spent = sum of completed orders for this user
  if total_spent >= 300000: grade = "로열"
  elif total_spent >= 100000: grade = "프리미엄"  
  elif total_spent >= 30000: grade = "우수"
  else: grade = "일반"
  ```
- Add grade field to User schema/response

### Frontend - MyPage (Member/FTMypageMain.tsx)
- Show grade badge prominently: "🥇 로열회원" or "일반회원"
- Grade benefits box:
  ```
  현재 등급: 우수회원
  다음 등급까지: 프리미엄 (₩70,000 더 구매하면 달성!)
  혜택: 포인트 6% 적립 | 생일 쿠폰 | 무료배송 쿠폰 2장/월
  ```
- Progress bar: current spending / next grade threshold
- Grade colors: 일반=gray, 우수=blue, 프리미엄=purple, 로열=gold

### Frontend - Header
- When logged in, show grade badge next to username in top bar

---

## FIX 6: 구매자 통계 (상품 상세)

Real yes24 shows buyer demographics for popular books.

### Backend
Add stats endpoint: GET /api/v1/products/{goods_no}/stats
```python
@router.get("/{goods_no}/stats")
async def get_product_stats(goods_no: int, db: AsyncSession = Depends(get_db)):
    # Generate deterministic stats based on goods_no
    import random
    rng = random.Random(goods_no)
    
    age_groups = {
        "10대": rng.randint(5, 20),
        "20대": rng.randint(15, 40),
        "30대": rng.randint(20, 45),
        "40대": rng.randint(10, 30),
        "50대 이상": rng.randint(5, 20),
    }
    total = sum(age_groups.values())
    age_pct = {k: round(v/total*100) for k, v in age_groups.items()}
    
    male = rng.randint(30, 70)
    female = 100 - male
    
    # Normalize age percentages to sum to 100
    diff = 100 - sum(age_pct.values())
    age_pct["30대"] += diff
    
    return {
        "goods_no": goods_no,
        "age_distribution": age_pct,  # {"10대": 12, "20대": 35, ...}
        "gender": {"남성": male, "여성": female},
        "reorder_rate": rng.randint(15, 45),  # % who bought again
        "gift_rate": rng.randint(10, 35),  # % who bought as gift
    }
```

### Frontend - Product Detail
Add "구매자 분석" section in 상품정보 tab (below description):

```
구매자 분석
성별 비율: 남성 45% ████░░ 여성 55%
연령대:
  20대 ████████░░ 38%
  30대 ██████░░░░ 28%
  40대 ████░░░░░░ 20%
  ...
재구매율: 23%  |  선물 구매: 18%
```

Render with CSS bar charts (no external chart library needed):
```typescript
function StatBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 60, fontSize: 12, color: '#666' }}>{label}</span>
      <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 2, height: 12 }}>
        <div style={{ width: `${value}%`, background: '#0080ff', height: '100%', borderRadius: 2 }} />
      </div>
      <span style={{ width: 32, fontSize: 12, color: '#333', textAlign: 'right' }}>{value}%</span>
    </div>
  );
}
```

Fetch stats lazily (on tab open, not SSR).

---

## BUILD & TEST

```
cd ~/Desktop/yes24_clone
docker compose build frontend backend
docker compose up -d
```

Test:
```
/usr/bin/curl -s "http://localhost/api/v1/products/100014874/preview" | /usr/bin/python3 -c "import sys,json; d=json.load(sys.stdin); print('pages:', len(d['pages']))"
/usr/bin/curl -s "http://localhost/api/v1/products/100014874/stats" | /usr/bin/python3 -c "import sys,json; d=json.load(sys.stdin); print('gender:', d['gender'])"
/usr/bin/curl -s "http://localhost/api/v1/products/bestseller?size=5" | /usr/bin/python3 -c "import sys,json; d=json.load(sys.stdin); print('rank_change:', [i.get('rank_change') for i in d['items']])"
/usr/bin/curl -s -o /dev/null -w "%{http_code}" http://localhost/Product/Goods/100014874
```
