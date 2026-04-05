-- YES24 Clone Database Schema
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Categories: 3-level hierarchy matching YES24 numeric codes
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(12) NOT NULL UNIQUE,
    name_ko     VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100),
    parent_code VARCHAR(12),
    depth       SMALLINT NOT NULL DEFAULT 1,
    display_order INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    icon_url    VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cat_parent ON categories(parent_code);
CREATE INDEX idx_cat_depth ON categories(depth);

-- Products
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    goods_no        BIGINT NOT NULL UNIQUE,
    title           VARCHAR(500) NOT NULL,
    subtitle        VARCHAR(500),
    author          VARCHAR(300) NOT NULL,
    translator      VARCHAR(200),
    publisher       VARCHAR(200) NOT NULL,
    publish_date    DATE,
    isbn            VARCHAR(20),
    category_code   VARCHAR(12) NOT NULL,
    product_type    VARCHAR(20) NOT NULL DEFAULT 'book',
    original_price  INTEGER NOT NULL,
    sale_price      INTEGER NOT NULL,
    discount_rate   SMALLINT NOT NULL DEFAULT 0,
    point_rate      SMALLINT NOT NULL DEFAULT 5,
    description     TEXT,
    toc             TEXT,
    cover_image     VARCHAR(500),
    page_count      SMALLINT,
    weight_grams    SMALLINT,
    dimensions      VARCHAR(50),
    sales_index     INTEGER NOT NULL DEFAULT 0,
    review_count    INTEGER NOT NULL DEFAULT 0,
    rating_avg      NUMERIC(2,1) NOT NULL DEFAULT 0.0,
    is_available    BOOLEAN NOT NULL DEFAULT TRUE,
    tags            TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_prod_category ON products(category_code);
CREATE INDEX idx_prod_type ON products(product_type);
CREATE INDEX idx_prod_sales ON products(sales_index DESC);
CREATE INDEX idx_prod_date ON products(publish_date DESC);
CREATE INDEX idx_prod_goods_no ON products(goods_no);
CREATE INDEX idx_prod_search ON products USING gin(
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(author,'') || ' ' || coalesce(publisher,''))
);
CREATE INDEX idx_prod_title_trgm ON products USING gin(title gin_trgm_ops);

-- Users
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       VARCHAR(200) NOT NULL UNIQUE,
    username    VARCHAR(100) NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    phone       VARCHAR(20),
    point_balance INTEGER NOT NULL DEFAULT 0,
    grade       VARCHAR(20) NOT NULL DEFAULT 'SILVER',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(200),
    content     TEXT NOT NULL,
    likes       INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_review_product ON reviews(product_id);
CREATE INDEX idx_review_user ON reviews(user_id);

-- Cart items
CREATE TABLE cart_items (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    SMALLINT NOT NULL DEFAULT 1,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Wishlist
CREATE TABLE wishlist_items (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_id)
);

-- Orders
CREATE TABLE orders (
    id              SERIAL PRIMARY KEY,
    order_no        VARCHAR(20) NOT NULL UNIQUE,
    user_id         INTEGER NOT NULL REFERENCES users(id),
    total_amount    INTEGER NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    shipping_addr   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER NOT NULL REFERENCES orders(id),
    product_id  INTEGER NOT NULL REFERENCES products(id),
    quantity    SMALLINT NOT NULL DEFAULT 1,
    unit_price  INTEGER NOT NULL
);

-- Banners
CREATE TABLE banners (
    id          SERIAL PRIMARY KEY,
    slot        VARCHAR(50) NOT NULL,
    title       VARCHAR(200),
    image_url   VARCHAR(500),
    link_url    VARCHAR(500),
    display_order INT NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    start_date  TIMESTAMPTZ,
    end_date    TIMESTAMPTZ
);

-- Events
CREATE TABLE events (
    id          SERIAL PRIMARY KEY,
    event_no    INTEGER NOT NULL UNIQUE,
    title       VARCHAR(300) NOT NULL,
    description TEXT,
    banner_image VARCHAR(500),
    content_html TEXT,
    start_date  TIMESTAMPTZ,
    end_date    TIMESTAMPTZ,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- User addresses
CREATE TABLE user_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    label VARCHAR(50) NOT NULL DEFAULT '집',
    recipient VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    zipcode VARCHAR(10),
    address1 VARCHAR(300) NOT NULL,
    address2 VARCHAR(200),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Static pages (terms, privacy, about, etc.)
CREATE TABLE static_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'company',
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FAQ items
CREATE TABLE faq_items (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Customer tickets
CREATE TABLE customer_tickets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Q&A
CREATE TABLE product_qna (
    id          SERIAL PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    question_title VARCHAR(200) NOT NULL,
    question_body TEXT NOT NULL,
    answer_body TEXT,
    is_answered BOOLEAN NOT NULL DEFAULT FALSE,
    is_secret   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ
);
CREATE INDEX idx_qna_product ON product_qna(product_id);
CREATE INDEX idx_qna_user ON product_qna(user_id);

-- Review Helpful Votes
CREATE TABLE review_helpful (
    id          SERIAL PRIMARY KEY,
    review_id   INTEGER NOT NULL REFERENCES reviews(id),
    user_id     INTEGER NOT NULL REFERENCES users(id),
    UNIQUE(review_id, user_id)
);
CREATE INDEX idx_review_helpful_review ON review_helpful(review_id);

-- Add vulnerability-required columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Add stock management columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 999;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_soldout BOOLEAN NOT NULL DEFAULT FALSE;

-- Coupons (updated with usage tracking)
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
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
);

-- User Coupons (registration & usage tracking)
CREATE TABLE IF NOT EXISTS user_coupons (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    coupon_id INTEGER NOT NULL REFERENCES coupons(id),
    used_at TIMESTAMPTZ,
    order_id INTEGER REFERENCES orders(id)
);

-- Event Products (many-to-many relationship)
CREATE TABLE IF NOT EXISTS event_products (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    display_order INT NOT NULL DEFAULT 0,
    UNIQUE(event_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_event_products_event ON event_products(event_id);
