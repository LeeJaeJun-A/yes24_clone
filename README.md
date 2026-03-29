# YES24 Clone

A pixel-perfect, full-stack clone of [yes24.com](https://www.yes24.com) — South Korea's largest online bookstore. Built as a realistic e-commerce test environment with complete frontend, backend, and database layers.

![YES24 Clone](https://picsum.photos/seed/yes24readme/1200/400)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (Pages Router) + TypeScript |
| Backend | Python 3.11 + FastAPI |
| Database | PostgreSQL 17 |
| Cache | Redis 7 |
| Storage | MinIO (S3-compatible) |
| Proxy | Nginx |
| Infra | Docker Compose |

---

## Features

### 🛍️ E-Commerce Flows
- Full cart → checkout → order complete flow
- Mock payment (신용카드, 카카오페이, 네이버페이, 토스)
- Order history, order detail, order cancellation
- Wishlist management
- YES포인트 accumulation (5% per purchase)
- Coupon system

### 📚 Product Catalog
- 15,000+ Korean books with realistic metadata
- 3-level category tree (국내도서 → 소설/시/희곡 → 한국소설)
- Bestseller / New / Steady / Recommended rankings with rank change indicators (▲▼ NEW)
- Product detail: description, TOC, reviews, Q&A, related books
- Book format tabs: 종이책 / eBook / 오디오북
- Book preview modal (cover + TOC + sample pages)
- Buyer demographics (age/gender distribution bar charts)
- Real-time delivery estimate

### 🔍 Search
- Korean full-text search (ILIKE across title, author, publisher)
- Autocomplete with keyboard navigation (↑↓ Enter Esc)
- Recent searches (localStorage)
- Filter facets: category, publisher, price range, rating
- Sort: 정확도순 / 판매량순 / 최신순 / 가격순

### 👤 Auth & MyPage
- JWT authentication (login / register / refresh)
- Member grade system: 일반 → 우수 → 프리미엄 → 로열
- MyPage with persistent sidebar navigation:
  - 주문내역, 취소/반품, 위시리스트, 최근 본 상품
  - 내 리뷰, 쿠폰함, YES포인트, 배송지관리, 내 정보 수정, 1:1 문의

### 🎨 UI
- Pixel-perfect YES24 design (color scheme, typography, layout)
- Mega menu with featured books per category on hover
- Homepage: dark category sidebar + banner carousel + category grid
- Skeleton loading screens, error boundaries, custom 404 page
- Event pages with full-width banner images
- Funding page with progress bars

### 📊 Data
- 15,000 Korean books (realistic titles, authors, publishers, ISBNs, prices)
- 45,000+ reviews with Korean content
- 3,000+ orders across 700 user accounts
- 30 events, 15 fundings, 20 banners
- Redis autocomplete index (10,000 titles)

---

## Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)
- Git

### 1. Clone the repository

```bash
git clone git@github.com:LeeJaeJun-A/yes24_clone.git
cd yes24_clone
```

### 2. Start the stack

```bash
docker compose up -d
```

This starts 6 containers: frontend, backend, postgres, redis, minio, nginx.
Wait ~30 seconds for all services to become healthy.

### 3. Seed the database

```bash
docker compose --profile seed run --rm seeder
```

This populates the database with 15,000 books, users, orders, reviews, events, and banners. Takes 3–5 minutes.

### 4. Open in browser

```
http://localhost
```

---

## Test Accounts

| Email | Password | Grade |
|-------|----------|-------|
| test@yes24.com | password123 | 우수회원 |
| user1@yes24.com | password123 | 일반회원 |
| premium@yes24.com | password123 | 프리미엄 |

---

## API Reference

The backend API is available at `http://localhost/api/v1/`.

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories` | Full category tree |
| GET | `/api/v1/products/bestseller?size=24` | Bestseller list |
| GET | `/api/v1/products/new?limit=24` | New arrivals |
| GET | `/api/v1/products/{goods_no}` | Product detail |
| GET | `/api/v1/products/{goods_no}/reviews` | Product reviews |
| GET | `/api/v1/products/{goods_no}/qna` | Product Q&A |
| GET | `/api/v1/products/{goods_no}/stats` | Buyer demographics |
| GET | `/api/v1/products/{goods_no}/preview` | Book preview pages |
| GET | `/api/v1/search?q=파이썬` | Search products |
| GET | `/api/v1/search/autocomplete?q=파` | Autocomplete suggestions |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/register` | Register |
| GET | `/api/v1/cart` | Get cart (auth required) |
| POST | `/api/v1/cart` | Add to cart |
| GET | `/api/v1/orders` | Order history |
| POST | `/api/v1/orders/checkout` | Place order |
| GET | `/api/v1/banners` | Homepage banners |
| GET | `/api/v1/events` | Event list |

Interactive API docs: `http://localhost/api/v1/docs`

---

## Project Structure

```
yes24_clone/
├── frontend/                  # Next.js app
│   ├── components/
│   │   ├── common/            # ProductCard, Pagination, Skeleton, ErrorBoundary
│   │   └── layout/            # Header, Footer, Layout, MypageLayout
│   ├── pages/
│   │   ├── main/              # Homepage
│   │   ├── Product/           # Category, Search, Goods detail
│   │   ├── Member/            # MyPage, Orders, Wishlist, etc.
│   │   ├── Cart/              # Shopping cart
│   │   ├── Order/             # Checkout, Complete
│   │   ├── event/             # Events
│   │   ├── Funding/           # Funding campaigns
│   │   └── Company/           # Static company pages
│   ├── lib/
│   │   ├── api.ts             # API client + getCoverUrl helper
│   │   ├── auth.tsx           # Auth context
│   │   ├── types.ts           # TypeScript interfaces
│   │   └── constants.ts       # Shared constants
│   └── styles/                # CSS modules
│
├── backend/                   # FastAPI app
│   └── src/yes24_clone/
│       ├── api/               # Route handlers
│       ├── models/            # SQLAlchemy models
│       ├── schemas/           # Pydantic schemas
│       ├── seed/              # Database seeder
│       └── db/                # Database session
│
├── nginx/                     # Nginx config
├── docker-compose.yml
└── Makefile
```

---

## Development

### Rebuild after code changes

```bash
# Frontend only
docker compose build frontend && docker compose up -d frontend

# Backend only
docker compose build backend && docker compose up -d backend

# Both
docker compose build frontend backend && docker compose up -d
```

### View logs

```bash
docker compose logs -f frontend
docker compose logs -f backend
```

### Access database

```bash
docker compose exec postgres psql -U yes24 -d yes24
```

### Reset everything

```bash
docker compose down -v   # removes volumes (all data)
docker compose up -d
docker compose --profile seed run --rm seeder
```

---

## Notes

- All UI text is in Korean (한국어)
- Book cover images are served via [picsum.photos](https://picsum.photos) with deterministic seeds based on `goods_no`
- Payment flows are mocked — no real transactions occur
- This is a clone built for testing/benchmarking purposes only
