# Yes24.com Design Research

## Brand Colors

| Role | Hex | Usage |
|------|-----|-------|
| Primary Red | `#e51937` | Logo, CTAs, sale badges, active nav |
| Dark Red | `#c7000b` | Hover states, price text |
| Header Dark Blue | `#1a1a3e` | Top utility bar background |
| Nav Background | `#ffffff` | Main nav bar |
| Nav Border | `#d5d5d5` | Horizontal rule under nav |
| Body Background | `#f5f5f5` | Page background |
| Card Background | `#ffffff` | Product cards, content areas |
| Text Primary | `#333333` | Body text |
| Text Secondary | `#666666` | Subtitles, metadata |
| Text Muted | `#999999` | Placeholders, disabled |
| Link Blue | `#0066cc` | Text links |
| Price Red | `#e51937` | Sale/discount prices |
| Price Original | `#999999` | Strikethrough original prices |
| Border Light | `#e5e5e5` | Card borders, dividers |
| Rating Yellow | `#ffc107` | Star ratings |
| Point Green | `#00a651` | YES포인트 badges |
| Button Primary BG | `#e51937` | 장바구니, 바로구매 |
| Button Secondary BG | `#555555` | 위시리스트, 기타 |
| Button Outline | `#d5d5d5` | Ghost buttons |
| Footer BG | `#2b2b2b` | Footer background |
| Footer Text | `#aaaaaa` | Footer body text |

## Typography

- **Primary Font**: `'Noto Sans KR', 'Malgun Gothic', '맑은 고딕', sans-serif`
- **Fallback**: `'Dotum', '돋움', 'Apple SD Gothic Neo', sans-serif`
- **Logo**: Custom/bold sans-serif, red on white
- **Base font size**: 13px (Korean web standard)
- **Line height**: 1.5
- **Heading sizes**: 24px (h1), 20px (h2), 16px (h3), 14px (h4)
- **Body text**: 13px regular (400)
- **Strong/labels**: 13px bold (700)
- **Small/meta**: 11px-12px

## Header Structure

### Top Utility Bar (dark blue-black `#1a1a3e`)
- Left: 로그인 | 회원가입 | 마이페이지 | 고객센터 | 주문조회
- Right: 최근 본 상품 | 매장안내 | Global YES24
- Height: ~32px, font-size: 12px, white text

### Main Header (white background)
- Left: YES24 logo (red text, bold)
- Center: Search bar
  - Category dropdown (left of input)
  - Text input (wide, border: 2px solid #e51937)
  - Search button (red bg, white magnifier icon)
- Right: 위시리스트 | 장바구니(N) | 주문/배송 icons
- Height: ~80px

### Main Navigation (white bg, bottom border)
- Items: 국내도서 | 외국도서 | eBook | 중고도서 | 음반/DVD | 문구/오피스 | 선물/생활 | 전자/가전 | YES충전 | 크레마클럽
- On hover: mega dropdown menu appears
- Active/hover: red underline or red text
- Height: ~42px, font-size: 14px

### Mega Menu (dropdown)
- White background, box-shadow
- 2-3 column layout
- Category headers bold, subcategories regular
- Left column: 중분류 list
- Right area: 소분류 grid or promotional banners

## Homepage Layout

### 1. Hero Banner Carousel
- Full width (within max-width 1200px container)
- Auto-rotating, 5-7 slides
- Navigation dots at bottom
- Prev/next arrows on hover
- Height: ~400px

### 2. Quick Category Icons
- Horizontal row of circular icons
- 10 categories with icon + Korean label
- Centered, evenly spaced

### 3. 오늘의 책 (Today's Book)
- Featured single book with large cover + description

### 4. 베스트셀러 (Bestseller)
- Section title with "더보기 >" link
- Horizontal scrollable list or 5-column grid
- Rank numbers (1-10) overlaid on covers
- Book card: cover, title (truncated 2 lines), author, price

### 5. 신간도서 (New Releases)
- Similar layout to bestseller
- 4-5 column grid
- Book cards with "NEW" badge

### 6. 추천도서 (Recommended)
- "MD추천" or staff pick section
- May include short blurb/review snippet

### 7. 이벤트/기획전 (Events/Features)
- Banner-style cards in 2-column grid
- Event title + date range
- Clickable to event detail

### 8. Footer
- Dark background (#2b2b2b)
- Company info: (주)예스이십사 사업자정보
- Links: 회사소개, 채용정보, 이용약관, 개인정보처리방침
- Customer service: 전화번호 1544-3800
- Copyright notice
- Social media icons

## Product Card Design

```
┌─────────────────┐
│   [Cover Image]  │  180×250px or similar
│                  │
├─────────────────┤
│ [Title 2 lines] │  13px bold, #333, ellipsis
│ [Author]        │  12px, #666
│ [Publisher]     │  12px, #999
│ ₩15,300 (10%)  │  sale_price red bold, discount_rate in red
│ ₩17,000        │  original strikethrough #999
│ ★ 4.5 (123)    │  yellow stars + review count
└─────────────────┘
```

## Product Detail Page

### Layout
- **Left column** (40%): Large cover image, thumbnail gallery
- **Right column** (60%):
  - Title (20px bold)
  - Author | Publisher | 출판일
  - ISBN
  - Price box: original, discount %, sale price (large red), YES포인트
  - Quantity selector
  - Action buttons: 장바구니 (red), 바로구매 (red outline), 위시리스트 (gray)
  - Delivery info

### Tabs Below
- 도서정보 | 목차 | 리뷰(N) | 교환/반품
- Tab content fills full width
- Active tab: red border-bottom

### Review Section
- Average rating display (large number + stars)
- Rating distribution bar chart
- Individual reviews: username, date, rating stars, content
- Write review button

## Category/List Page

- **Left sidebar** (200px): Category tree navigation
  - Current category highlighted in red/bold
  - Expandable subcategories
- **Main content**:
  - Breadcrumb: 홈 > 국내도서 > 소설/시/희곡
  - Sort bar: 판매량순 | 최신순 | 가격낮은순 | 가격높은순 | 평점순
  - View toggle: grid | list
  - Product grid (4 columns) or list
  - Pagination: « ‹ 1 2 3 4 5 › »

## Search Results Page

- Search query displayed: "'검색어' 검색결과 (N건)"
- Domain tabs: ALL | 국내도서 | 외국도서 | eBook | 음반 | DVD
- Filter sidebar: category, price range, rating
- Results in list view (similar to category page)

## Login Page

- Centered form (max-width 500px)
- Tabs: 회원 로그인 | 비회원 주문조회
- Email input
- Password input
- Checkbox: 아이디 저장
- Login button (full width, red)
- Links: 아이디 찾기 | 비밀번호 찾기 | 회원가입
- Social login section: 카카오, 네이버, 페이스북

## Cart Page

- Table layout with columns: checkbox | 상품정보 | 수량 | 상품금액 | 배송비
- Product row: cover thumbnail + title + author
- Quantity: - [N] + controls
- Bottom summary box:
  - 상품금액: ₩XX,XXX
  - 할인금액: -₩X,XXX
  - 배송비: ₩0 (무료)
  - 결제예정금액: ₩XX,XXX (bold, large)
- Buttons: 선택삭제, 전체삭제, 주문하기 (red)

## Key UI Patterns

1. **Max width**: 1200px centered container
2. **Grid system**: Custom, typically 4 or 5 columns for products
3. **Border radius**: 0-2px (very minimal, square design)
4. **Box shadows**: Subtle, `0 1px 3px rgba(0,0,0,0.08)`
5. **Transitions**: Hover opacity changes, color transitions 0.2s
6. **Icons**: Custom sprite or inline SVG
7. **Badges**: Red rounded rectangles for sales, NEW, etc.
8. **Korean number formatting**: ₩12,345 (comma separated with ₩ prefix)
9. **Mobile**: Responsive with hamburger menu at <768px
