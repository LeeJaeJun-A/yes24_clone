"""
YES24 Clone Data Seeder
Generates ~15,000 products, ~500 users, ~50,000 reviews, ~5,000 orders, ~1,000 addresses,
banners, events, cover images, static pages, FAQ, and coupons.
"""
import asyncio
import json
import random
import io
import os
import sys
from datetime import date, timedelta, datetime, timezone
from pathlib import Path

from faker import Faker
import bcrypt as _bcrypt
from PIL import Image, ImageDraw, ImageFont
from minio import Minio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import redis.asyncio as aioredis

fake = Faker("ko_KR")
Faker.seed(42)
random.seed(42)

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://yes24:yes24@localhost:5432/yes24")
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
MINIO_ENDPOINT = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
MINIO_SECRET_KEY = os.environ.get("MINIO_SECRET_KEY", "minioadmin")

NUM_PRODUCTS = 15000
NUM_USERS = 500
NUM_REVIEWS = 50000
BATCH_SIZE = 500

PUBLISHERS = [
    "문학동네", "민음사", "창비", "김영사", "위즈덤하우스", "다산북스", "한빛미디어",
    "인사이트", "길벗", "에이콘출판사", "한빛미디어", "제이펍", "영진닷컴", "이지스퍼블리싱",
    "더퀘스트", "알에이치코리아", "웅진지식하우스", "쌤앤파커스", "비즈니스북스", "수오서재",
    "포레스트북스", "마음산책", "북하우스", "열린책들", "시공사", "문학과지성사",
    "현대문학", "자음과모음", "은행나무", "21세기북스", "토네이도", "프리렉",
    "한빛아카데미", "미래엔", "동아출판", "비상교육", "천재교육", "대원씨아이",
    "서울문화사", "학산문화사", "YBM", "시사영어사", "넥서스", "다락원",
    "곰돌이", "비룡소", "보림", "사계절출판사", "문학수첩", "갈라파고스",
]

TITLE_PARTS = {
    "fiction": {
        "prefix": ["어느", "마지막", "첫번째", "우리들의", "나의", "그해", "오래된", "새벽의", "한밤의"],
        "noun": ["정원", "도서관", "기억", "여행", "편지", "약속", "겨울", "봄날", "골목", "바다",
                 "숲속", "노래", "이야기", "시간", "공간", "마을", "거리", "하늘", "강", "별"],
        "suffix": ["에서 온 편지", "을 걷다", "의 기록", "이 끝나는 곳", "을 품다", "에서", "의 비밀", "의 문"],
    },
    "essay": {
        "prefix": ["나는", "오늘도", "가끔은", "그러니까", "어쩌면", "결국", "다시", "매일"],
        "noun": ["하루", "마음", "여행", "산책", "일상", "행복", "사랑", "위로", "감사", "용기"],
        "suffix": ["을 산다", "이 좋다", "에 대하여", "을 읽다", "을 쓰다", "이었다", "을 만나다"],
    },
    "business": {
        "prefix": ["당신의", "성공하는", "1등의", "혁신적인", "글로벌", "디지털", "초격차"],
        "noun": ["전략", "습관", "비즈니스", "리더십", "마케팅", "투자", "경제학", "혁신", "성장"],
        "suffix": ["의 법칙", "수업", "바이블", " 가이드", "의 비밀", "의 기술", " 전략"],
    },
    "science": {
        "prefix": ["알기 쉬운", "재미있는", "놀라운", "과학으로 보는", "미래의", "코스모스"],
        "noun": ["우주", "물리학", "생명", "뇌", "유전자", "양자역학", "수학", "화학", "진화"],
        "suffix": ["의 세계", "이야기", " 이론", " 탐험", "의 발견", "을 읽다", "의 역사"],
    },
    "it": {
        "prefix": ["실전", "처음 배우는", "모던", "핵심", "프로", "한 권으로 끝내는"],
        "noun": ["파이썬", "자바스크립트", "리액트", "딥러닝", "데이터분석", "알고리즘", "클라우드",
                 "쿠버네티스", "도커", "타입스크립트", "SQL", "Go", "러스트"],
        "suffix": [" 프로그래밍", " 완벽 가이드", " 교과서", " 인 액션", " 마스터", " 첫걸음"],
    },
    "children": {
        "prefix": ["즐거운", "신나는", "호기심", "꼬마", "아기", "우리 아이"],
        "noun": ["공룡", "동물", "우주", "과학", "숫자", "한글", "영어", "그림", "놀이", "모험"],
        "suffix": [" 대탐험", " 이야기", " 놀이북", " 사전", "의 세계", " 그림책"],
    },
}

GENRE_CATEGORY_MAP = {
    "fiction": ["001001001", "001001002", "001001003", "001001004", "001001005"],
    "essay": ["001002001", "001002002", "001002003"],
    "business": ["001008001", "001008002", "001008003", "001008004", "001008005"],
    "science": ["001010001", "001010002", "001010003", "001010004", "001010005"],
    "it": ["001011001", "001011002", "001011003", "001011004", "001011005", "001011006"],
    "children": ["001015001", "001015002", "001015003", "001015004", "001015005"],
}

# For categories not covered above, generic titles
OTHER_CATEGORIES = [
    "001003001", "001003002", "001003003", "001003004", "001003005", "001003006",
    "001004001", "001004002", "001004003", "001004004",
    "001005001", "001005002", "001005003", "001005004",
    "001006001", "001006002", "001006003", "001006004", "001006005",
    "001007001", "001007002", "001007003", "001007004",
    "001009001", "001009002", "001009003",
    "001012001", "001012002", "001012003", "001012004",
    "001013001", "001013002", "001013003", "001013004",
    "001014001", "001014002",
    "001016001", "001016002",
    "001017001", "001017002", "001017003",
    "001018001", "001018002", "001018003", "001018004", "001018005",
    "001019001", "001019002", "001019003", "001019004",
    "002001001", "002001002", "002001003", "002002001", "002002002",
    "003001001", "003001002", "003001003", "003002", "003003", "003004",
    "004001", "004002", "004003", "004004",
    "005001", "005002", "005003", "005004",
    "006001", "006002", "006003", "006004",
    "007001", "007002", "007003",
]

COVER_COLORS = [
    "#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560",
    "#2b2d42", "#8d99ae", "#ef233c", "#264653", "#2a9d8f",
    "#e9c46a", "#f4a261", "#e76f51", "#606c38", "#283618",
    "#dda15e", "#bc6c25", "#6d6875", "#b5838d", "#ffb4a2",
    "#023e8a", "#0077b6", "#0096c7", "#00b4d8", "#48cae4",
]

REVIEW_TEMPLATES = [
    "정말 재미있게 읽었습니다. 추천합니다!",
    "기대했던 것보다 훨씬 좋았어요.",
    "내용이 알차고 유익합니다.",
    "한 번 읽기 시작하면 멈출 수가 없었어요.",
    "이 분야 입문서로 최고입니다.",
    "글이 쉽고 이해하기 좋습니다.",
    "두 번째 읽고 있는데 또 새롭습니다.",
    "선물용으로 구매했는데 반응이 좋았어요.",
    "배송도 빠르고 책 상태도 좋습니다.",
    "가격 대비 만족스러운 책입니다.",
    "오랜만에 좋은 책을 만났습니다.",
    "작가의 다른 작품도 읽어볼 예정입니다.",
    "초보자에게 적합한 책이에요.",
    "전문적인 내용이지만 쉽게 설명되어 있어요.",
    "시간 가는 줄 모르고 읽었습니다.",
    "깊이 있는 내용에 감동받았습니다.",
    "실용적인 내용이 많아서 도움이 됩니다.",
    "다소 아쉬운 부분도 있지만 전체적으로 괜찮습니다.",
    "기대보다 내용이 얇아서 조금 아쉽습니다.",
    "재미와 교양을 동시에 잡은 책입니다.",
    "문장이 아름답고 여운이 남습니다.",
    "아이가 정말 좋아하는 책입니다.",
    "학교 수업에 도움이 많이 됩니다.",
    "사진과 그림이 풍부해서 보기 좋습니다.",
    "이해하기 어려운 부분이 조금 있었습니다.",
    "번역이 매끄럽고 자연스럽습니다.",
    "원서와 비교해도 손색없는 번역입니다.",
    "시리즈 전체를 모으고 있습니다.",
    "표지 디자인이 예뻐서 소장가치가 있어요.",
    "주변 지인들에게도 추천했습니다.",
]

DESCRIPTION_TEMPLATES = [
    "이 책은 {topic}에 대한 깊이 있는 통찰을 제공합니다. {author}의 오랜 연구와 경험이 담긴 역작으로, 독자들에게 새로운 시각을 열어줍니다.",
    "{topic} 분야의 필독서. {author}만의 독특한 시각으로 풀어낸 이 책은 출간 즉시 화제를 모았습니다. 전문가와 일반 독자 모두에게 추천합니다.",
    "베스트셀러 작가 {author}의 신작. {topic}을 주제로 한 이 책은 우리 시대의 중요한 질문에 답합니다. 2024년 가장 주목받는 도서 중 하나입니다.",
    "{author}가 {years}년간의 취재를 바탕으로 쓴 {topic} 이야기. 생생한 현장감과 깊은 울림이 있는 작품입니다.",
]

TOC_TEMPLATE = """프롤로그

제1장 {ch1}
제2장 {ch2}
제3장 {ch3}
제4장 {ch4}
제5장 {ch5}
제6장 {ch6}

에필로그
참고문헌
"""


def generate_title(genre: str) -> str:
    parts = TITLE_PARTS.get(genre, TITLE_PARTS["fiction"])
    pattern = random.choice(["prefix_noun_suffix", "prefix_noun", "noun_suffix"])
    if pattern == "prefix_noun_suffix":
        return f"{random.choice(parts['prefix'])} {random.choice(parts['noun'])}{random.choice(parts['suffix'])}"
    elif pattern == "prefix_noun":
        return f"{random.choice(parts['prefix'])} {random.choice(parts['noun'])}"
    else:
        return f"{random.choice(parts['noun'])}{random.choice(parts['suffix'])}"


def generate_isbn() -> str:
    return f"979-11-{random.randint(1000,9999)}-{random.randint(100,999)}-{random.randint(0,9)}"


def pick_genre_for_category(category_code: str) -> str:
    for genre, codes in GENRE_CATEGORY_MAP.items():
        if category_code in codes:
            return genre
    return random.choice(["fiction", "essay", "business"])


def generate_description(author: str, genre: str) -> str:
    topics = {
        "fiction": ["삶과 사랑", "인간 본성", "현대 사회", "가족", "우정"],
        "essay": ["일상의 행복", "여행과 삶", "자연과 사색", "도시 생활"],
        "business": ["리더십", "혁신 전략", "투자", "창업", "디지털 전환"],
        "science": ["우주의 기원", "생명의 신비", "양자역학", "인공지능"],
        "it": ["소프트웨어 개발", "시스템 설계", "데이터 과학", "클라우드 컴퓨팅"],
        "children": ["모험", "우정", "자연", "과학 탐구"],
    }
    topic = random.choice(topics.get(genre, topics["fiction"]))
    template = random.choice(DESCRIPTION_TEMPLATES)
    return template.format(topic=topic, author=author, years=random.randint(3, 15))


def generate_toc() -> str:
    chapters = [fake.catch_phrase()[:20] for _ in range(6)]
    return TOC_TEMPLATE.format(
        ch1=chapters[0], ch2=chapters[1], ch3=chapters[2],
        ch4=chapters[3], ch5=chapters[4], ch6=chapters[5],
    )


def generate_cover_image(title: str, author: str, publisher: str) -> bytes:
    width, height = 300, 430
    bg_color = random.choice(COVER_COLORS)
    img = Image.new("RGB", (width, height), bg_color)
    draw = ImageDraw.Draw(img)

    # Try to use NanumGothic, fall back to default
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf", 24)
        font_medium = ImageFont.truetype("/usr/share/fonts/truetype/nanum/NanumGothic.ttf", 16)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/nanum/NanumGothic.ttf", 12)
    except (OSError, IOError):
        font_large = ImageFont.load_default()
        font_medium = font_large
        font_small = font_large

    # Decorative line
    draw.rectangle([(20, 80), (280, 82)], fill="white")

    # Title - wrap to fit
    title_display = title[:30] + ("..." if len(title) > 30 else "")
    if len(title_display) > 15:
        line1 = title_display[:15]
        line2 = title_display[15:]
        draw.text((30, 100), line1, fill="white", font=font_large)
        draw.text((30, 132), line2, fill="white", font=font_large)
    else:
        draw.text((30, 110), title_display, fill="white", font=font_large)

    # Author
    draw.text((30, 280), author, fill="#cccccc", font=font_medium)

    # Publisher
    draw.text((30, 380), publisher, fill="#999999", font=font_small)

    # Bottom line
    draw.rectangle([(20, 410), (280, 412)], fill="white")

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=80)
    return buf.getvalue()


def get_product_type(category_code: str) -> str:
    if category_code.startswith("003"):
        return "cd"
    elif category_code.startswith("004"):
        return "dvd"
    elif category_code.startswith("005"):
        return "ebook"
    elif category_code.startswith("006"):
        return "gift"
    elif category_code.startswith("008"):
        return "ticket"
    return "book"


async def seed_categories(session: AsyncSession, categories_data: list[dict]):
    print(f"Seeding {len(categories_data)} categories...")
    for cat in categories_data:
        await session.execute(
            text("""
                INSERT INTO categories (code, name_ko, name_en, parent_code, depth, display_order)
                VALUES (:code, :name_ko, :name_en, :parent_code, :depth, :display_order)
                ON CONFLICT (code) DO NOTHING
            """),
            cat,
        )
    await session.commit()
    print("Categories seeded.")


async def seed_users(session: AsyncSession):
    print(f"Seeding {NUM_USERS} users...")
    password_hash = _bcrypt.hashpw(b"test1234", _bcrypt.gensalt()).decode()
    grades = ["SILVER", "GOLD", "PLATINUM", "VIP"]

    for i in range(0, NUM_USERS, BATCH_SIZE):
        batch = []
        for j in range(i, min(i + BATCH_SIZE, NUM_USERS)):
            batch.append({
                "email": f"user{j+1}@yes24clone.com",
                "username": fake.name(),
                "password_hash": password_hash,
                "phone": fake.phone_number(),
                "point_balance": random.randint(0, 50000),
                "grade": random.choice(grades),
            })
        for user_data in batch:
            await session.execute(
                text("""
                    INSERT INTO users (email, username, password_hash, phone, point_balance, grade)
                    VALUES (:email, :username, :password_hash, :phone, :point_balance, :grade)
                    ON CONFLICT (email) DO NOTHING
                """),
                user_data,
            )
        await session.commit()
    print("Users seeded.")


async def seed_products(session: AsyncSession, leaf_categories: list[str], minio_client: Minio):
    print(f"Seeding {NUM_PRODUCTS} products with cover images...")

    # Ensure bucket exists
    if not minio_client.bucket_exists("covers"):
        minio_client.make_bucket("covers")
        # Set public read policy
        import json as json_lib
        policy = {
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": ["arn:aws:s3:::covers/*"],
            }],
        }
        minio_client.set_bucket_policy("covers", json_lib.dumps(policy))

    goods_no_start = 100000001
    today = date.today()

    for i in range(0, NUM_PRODUCTS, BATCH_SIZE):
        batch_end = min(i + BATCH_SIZE, NUM_PRODUCTS)
        print(f"  Products {i+1}-{batch_end}...")

        for j in range(i, batch_end):
            goods_no = goods_no_start + j
            category_code = random.choice(leaf_categories)
            genre = pick_genre_for_category(category_code)
            product_type = get_product_type(category_code)

            title = generate_title(genre)
            author = fake.name()
            publisher = random.choice(PUBLISHERS)
            original_price = random.choice(range(8000, 55000, 1000))
            discount = random.choice([0, 5, 10, 10, 10, 15, 15, 20])
            sale_price = int(original_price * (100 - discount) / 100)
            publish_date = today - timedelta(days=random.randint(0, 1500))
            sales_index = int(random.paretovariate(1.5) * 100)
            rating = round(random.uniform(2.5, 5.0), 1)
            rating = min(rating, 5.0)

            cover_image_name = f"{goods_no}.jpg"

            # Generate and upload cover image
            img_bytes = generate_cover_image(title, author, publisher)
            minio_client.put_object(
                "covers", cover_image_name,
                io.BytesIO(img_bytes), len(img_bytes),
                content_type="image/jpeg",
            )

            description = generate_description(author, genre)
            toc = generate_toc() if product_type == "book" else None

            tags_pool = ["베스트셀러", "화제의책", "MD추천", "이달의책", "신간", "스테디셀러",
                        "할인중", "사은품", "한정판", "시리즈", "수상작", "영화원작"]
            tags = random.sample(tags_pool, k=random.randint(0, 3))

            await session.execute(
                text("""
                    INSERT INTO products (
                        goods_no, title, subtitle, author, translator, publisher,
                        publish_date, isbn, category_code, product_type,
                        original_price, sale_price, discount_rate, point_rate,
                        description, toc, cover_image, page_count, weight_grams,
                        dimensions, sales_index, review_count, rating_avg,
                        is_available, tags
                    ) VALUES (
                        :goods_no, :title, :subtitle, :author, :translator, :publisher,
                        :publish_date, :isbn, :category_code, :product_type,
                        :original_price, :sale_price, :discount_rate, :point_rate,
                        :description, :toc, :cover_image, :page_count, :weight_grams,
                        :dimensions, :sales_index, :review_count, :rating_avg,
                        :is_available, :tags
                    ) ON CONFLICT (goods_no) DO NOTHING
                """),
                {
                    "goods_no": goods_no,
                    "title": title,
                    "subtitle": fake.sentence()[:60] if random.random() < 0.3 else None,
                    "author": author,
                    "translator": fake.name() if random.random() < 0.2 else None,
                    "publisher": publisher,
                    "publish_date": publish_date,
                    "isbn": generate_isbn() if product_type == "book" else None,
                    "category_code": category_code,
                    "product_type": product_type,
                    "original_price": original_price,
                    "sale_price": sale_price,
                    "discount_rate": discount,
                    "point_rate": 5,
                    "description": description,
                    "toc": toc,
                    "cover_image": cover_image_name,
                    "page_count": random.randint(150, 800) if product_type == "book" else None,
                    "weight_grams": random.randint(200, 1200) if product_type == "book" else None,
                    "dimensions": f"{random.choice([128,148,152,170])}x{random.choice([188,210,225,240])}mm",
                    "sales_index": sales_index,
                    "review_count": 0,
                    "rating_avg": rating,
                    "is_available": random.random() < 0.95,
                    "tags": tags if tags else None,
                },
            )

        await session.commit()

    print("Products seeded.")


async def seed_reviews(session: AsyncSession):
    print(f"Seeding {NUM_REVIEWS} reviews...")

    # Get product ids
    result = await session.execute(text("SELECT id FROM products ORDER BY sales_index DESC"))
    product_ids = [r[0] for r in result.all()]
    if not product_ids:
        print("No products found, skipping reviews.")
        return

    # Weighted distribution: top products get more reviews
    weights = [1.0 / (i + 1) ** 0.5 for i in range(len(product_ids))]
    total_weight = sum(weights)
    weights = [w / total_weight for w in weights]

    review_counts: dict[int, int] = {}

    for i in range(0, NUM_REVIEWS, BATCH_SIZE):
        batch_end = min(i + BATCH_SIZE, NUM_REVIEWS)
        if i % 5000 == 0:
            print(f"  Reviews {i+1}-{batch_end}...")

        for j in range(i, batch_end):
            product_id = random.choices(product_ids, weights=weights, k=1)[0]
            user_id = random.randint(1, NUM_USERS)
            rating = random.choices([1, 2, 3, 4, 5], weights=[2, 3, 10, 30, 55], k=1)[0]

            review_counts[product_id] = review_counts.get(product_id, 0) + 1

            await session.execute(
                text("""
                    INSERT INTO reviews (product_id, user_id, rating, title, content, likes)
                    VALUES (:product_id, :user_id, :rating, :title, :content, :likes)
                """),
                {
                    "product_id": product_id,
                    "user_id": user_id,
                    "rating": rating,
                    "title": fake.sentence()[:40] if random.random() < 0.5 else None,
                    "content": random.choice(REVIEW_TEMPLATES),
                    "likes": random.randint(0, 50),
                },
            )

        await session.commit()

    # Update review counts on products
    print("Updating product review counts...")
    for product_id, count in review_counts.items():
        await session.execute(
            text("UPDATE products SET review_count = :count WHERE id = :id"),
            {"count": count, "id": product_id},
        )
    await session.commit()

    # Update rating averages
    await session.execute(text("""
        UPDATE products SET rating_avg = sub.avg_rating
        FROM (SELECT product_id, ROUND(AVG(rating)::numeric, 1) as avg_rating FROM reviews GROUP BY product_id) sub
        WHERE products.id = sub.product_id
    """))
    await session.commit()
    print("Reviews seeded.")


async def seed_banners(session: AsyncSession):
    print("Seeding banners...")
    slots = ["home_main", "home_side", "category_top", "event_banner"]
    for i in range(50):
        slot = random.choice(slots)
        await session.execute(
            text("""
                INSERT INTO banners (slot, title, image_url, link_url, display_order, is_active)
                VALUES (:slot, :title, :image_url, :link_url, :display_order, :is_active)
            """),
            {
                "slot": slot,
                "title": f"프로모션 배너 {i+1}",
                "image_url": f"/image/banner_{i+1}.jpg",
                "link_url": f"/event/{1000 + i}",
                "display_order": i,
                "is_active": True,
            },
        )
    await session.commit()
    print("Banners seeded.")


async def seed_events(session: AsyncSession):
    print("Seeding events...")
    event_titles = [
        "봄맞이 도서 할인전", "베스트셀러 특별전", "신간 도서 페스티벌",
        "IT 도서 할인 이벤트", "어린이 도서 기획전", "외국어 학습 페어",
        "여름 독서 마라톤", "가을 인문학 축제", "연말 결산 할인전",
        "신년 새해 도서전", "발렌타인 선물 기획전", "어버이날 감사 기획전",
        "수험서 할인 이벤트", "여행 도서 특별전", "만화/웹툰 페스타",
        "클래식 음반 특별전", "K-POP 앨범 기획전", "영화 원작 도서전",
        "에세이 베스트 컬렉션", "자기계발 추천 도서전", "과학 교양 도서전",
        "요리 레시피 북 페어", "건강/운동 도서 특별전", "역사 교양 기획전",
        "청소년 추천 도서전", "대학생 교재 할인전", "직장인 추천 도서전",
        "주말 특가 이벤트", "회원 감사 이벤트", "포인트 적립 이벤트",
    ]
    today = date.today()
    for i, title in enumerate(event_titles):
        start = today - timedelta(days=random.randint(0, 30))
        end = start + timedelta(days=random.randint(14, 60))
        await session.execute(
            text("""
                INSERT INTO events (event_no, title, description, banner_image, content_html, start_date, end_date, is_active)
                VALUES (:event_no, :title, :description, :banner_image, :content_html, :start_date, :end_date, :is_active)
                ON CONFLICT (event_no) DO NOTHING
            """),
            {
                "event_no": 1000 + i,
                "title": title,
                "description": f"{title} - 다양한 도서를 특별 가격에 만나보세요!",
                "banner_image": f"/image/event_{1000+i}.jpg",
                "content_html": f"""
                <div class="event-content">
                    <h2>{title}</h2>
                    <p class="event-period">기간: {start.strftime('%Y.%m.%d')} ~ {end.strftime('%Y.%m.%d')}</p>
                    <div class="event-desc">
                        <p>YES24에서 준비한 특별한 이벤트!</p>
                        <p>다양한 도서를 최대 30% 할인된 가격에 만나보세요.</p>
                        <p>기간 내 구매 시 YES포인트 2배 적립!</p>
                    </div>
                    <div class="event-terms">
                        <h3>유의사항</h3>
                        <ul>
                            <li>본 이벤트는 기간 내에만 적용됩니다.</li>
                            <li>일부 상품은 할인 대상에서 제외될 수 있습니다.</li>
                            <li>포인트 적립은 결제 완료 후 자동 적립됩니다.</li>
                        </ul>
                    </div>
                </div>
                """,
                "start_date": datetime(start.year, start.month, start.day, tzinfo=timezone.utc),
                "end_date": datetime(end.year, end.month, end.day, tzinfo=timezone.utc),
                "is_active": end >= today,
            },
        )
    await session.commit()
    print("Events seeded.")


async def seed_orders(session: AsyncSession):
    print("Seeding stub orders...")
    statuses = ["PENDING", "PAID", "SHIPPING", "DELIVERED", "DELIVERED", "DELIVERED"]
    today = date.today()

    result = await session.execute(text("SELECT id, sale_price FROM products LIMIT 3000"))
    products = result.all()
    if not products:
        return

    for i in range(2000):
        user_id = random.randint(1, NUM_USERS)
        order_date = today - timedelta(days=random.randint(0, 365))
        order_no = f"YS{order_date.strftime('%Y%m%d')}{random.randint(10000,99999)}"
        num_items = random.randint(1, 4)
        items = random.sample(products, min(num_items, len(products)))
        total = sum(p[1] * random.randint(1, 2) for p in items)

        await session.execute(
            text("""
                INSERT INTO orders (order_no, user_id, total_amount, status, shipping_addr, created_at)
                VALUES (:order_no, :user_id, :total_amount, :status, :shipping_addr, :created_at)
                ON CONFLICT (order_no) DO NOTHING
            """),
            {
                "order_no": order_no,
                "user_id": user_id,
                "total_amount": total,
                "status": random.choice(statuses),
                "shipping_addr": fake.address(),
                "created_at": datetime(order_date.year, order_date.month, order_date.day, tzinfo=timezone.utc),
            },
        )

        # Get order id
        res = await session.execute(
            text("SELECT id FROM orders WHERE order_no = :order_no"), {"order_no": order_no}
        )
        order_row = res.first()
        if order_row:
            for prod_id, sale_price in items:
                qty = random.randint(1, 2)
                await session.execute(
                    text("""
                        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                        VALUES (:order_id, :product_id, :quantity, :unit_price)
                    """),
                    {
                        "order_id": order_row[0],
                        "product_id": prod_id,
                        "quantity": qty,
                        "unit_price": sale_price,
                    },
                )

        if i % 500 == 0:
            await session.commit()

    await session.commit()
    print("Orders seeded.")


async def seed_autocomplete(redis_client: aioredis.Redis, session: AsyncSession):
    print("Seeding Redis autocomplete index...")
    result = await session.execute(
        text("SELECT title, goods_no, sales_index FROM products ORDER BY sales_index DESC LIMIT 10000")
    )
    rows = result.all()

    pipe = redis_client.pipeline()
    for title, goods_no, sales_index in rows:
        # Create prefix entries
        score = 0  # All same score, sorted lexicographically
        entry = f"{title}"
        for prefix_len in range(1, min(len(title) + 1, 8)):
            prefix = title[:prefix_len].lower()
            pipe.zadd("autocomplete", {f"{prefix}|{title}": 0})

    await pipe.execute()
    print(f"Autocomplete index populated with {len(rows)} titles.")


async def seed_addresses(session: AsyncSession):
    print("Seeding addresses...")

    # Check if already seeded
    result = await session.execute(text("SELECT COUNT(*) FROM user_addresses"))
    existing = result.scalar() or 0
    if existing > 0:
        print(f"Already have {existing} addresses, skipping.")
        return

    CITIES = [
        ("서울특별시", ["강남구 테헤란로", "서초구 반포대로", "마포구 월드컵북로", "종로구 종로",
                    "강동구 천호대로", "송파구 올림픽로", "영등포구 여의대방로", "용산구 한남대로",
                    "성북구 보문로", "동대문구 장한로", "관악구 관악로", "구로구 디지털로"]),
        ("부산광역시", ["해운대구 해운대로", "수영구 광안해변로", "부산진구 중앙대로", "동래구 온천장로",
                    "사하구 낙동대로", "남구 수영로"]),
        ("대구광역시", ["수성구 달구벌대로", "중구 동성로", "북구 칠곡중앙대로", "달서구 월배로"]),
        ("인천광역시", ["남동구 인하로", "연수구 송도대로", "부평구 부평대로", "미추홀구 인하로"]),
        ("광주광역시", ["서구 상무중앙로", "북구 용봉로", "동구 금남로", "남구 봉선로"]),
        ("대전광역시", ["유성구 대학로", "서구 둔산로", "중구 대종로", "동구 동서대로"]),
        ("울산광역시", ["남구 삼산로", "중구 학성로", "북구 산업로"]),
        ("세종특별자치시", ["한누리대로", "보듬4로", "나성로", "도움5로"]),
    ]

    LABELS = ["집", "회사", "부모님댁", "학교", "기타"]

    # Get users
    result = await session.execute(text("SELECT id, username, phone FROM users"))
    users = result.all()
    if not users:
        print("No users found, skipping addresses.")
        return

    count = 0
    for user_id, username, phone in users:
        num_addresses = random.choice([1, 1, 1, 2, 2])
        for addr_i in range(num_addresses):
            city, streets = random.choice(CITIES)
            street = random.choice(streets)
            building_no = random.randint(1, 500)
            detail = random.choice([
                f"{random.randint(1,30)}층 {random.randint(100,999)}호",
                f"아파트 {random.randint(100,115)}동 {random.randint(100,2500)}호",
                f"오피스텔 {random.randint(1,20)}층 {random.randint(1,50)}호",
                f"빌라 {random.randint(1,5)}층",
                "",
            ])
            zipcode = f"{random.randint(10000,99999)}"
            label = LABELS[addr_i] if addr_i < len(LABELS) else "기타"

            await session.execute(
                text("""
                    INSERT INTO user_addresses (user_id, label, recipient, phone, zipcode, address1, address2, is_default)
                    VALUES (:user_id, :label, :recipient, :phone, :zipcode, :address1, :address2, :is_default)
                """),
                {
                    "user_id": user_id,
                    "label": label,
                    "recipient": username,
                    "phone": phone or f"010-{random.randint(1000,9999)}-{random.randint(1000,9999)}",
                    "zipcode": zipcode,
                    "address1": f"{city} {street} {building_no}",
                    "address2": detail if detail else None,
                    "is_default": addr_i == 0,
                },
            )
            count += 1

        if count % 500 == 0:
            await session.commit()

    await session.commit()
    print(f"Addresses seeded: {count} total.")


async def seed_static_pages(session: AsyncSession):
    print("Seeding static pages...")

    pages = [
        {
            "slug": "about",
            "title": "회사소개",
            "content": (
                "YES24는 1999년 설립 이래 대한민국 최대의 온라인 서점으로 성장해왔습니다. "
                "우리는 책을 통해 사람들의 삶을 풍요롭게 만든다는 사명 아래, 도서 유통의 혁신을 이끌어 왔습니다.\n\n"
                "창립 초기부터 YES24는 고객 중심의 서비스를 최우선으로 두고, 빠른 배송과 합리적인 가격, "
                "그리고 방대한 도서 데이터베이스를 제공하기 위해 노력해왔습니다. "
                "현재 1,000만 종 이상의 상품을 보유하고 있으며, 매일 수십만 건의 주문을 처리하고 있습니다.\n\n"
                "YES24는 단순한 온라인 서점을 넘어 종합 문화 플랫폼으로 진화하고 있습니다. "
                "도서 판매는 물론, 공연 티켓 예매, 중고서점, eBook 서비스, 문화 이벤트 등 "
                "다양한 문화 콘텐츠를 제공하며, 고객의 문화 생활을 더욱 풍성하게 만들어가고 있습니다.\n\n"
                "우리의 비전은 '모든 사람이 책과 문화를 쉽고 편리하게 접할 수 있는 세상'을 만드는 것입니다. "
                "이를 위해 AI 기반의 도서 추천 시스템, 개인화된 큐레이션 서비스, 그리고 독서 커뮤니티 플랫폼을 "
                "지속적으로 발전시켜 나가고 있습니다.\n\n"
                "YES24는 또한 사회적 책임을 다하는 기업으로서 다양한 공익 활동에 참여하고 있습니다. "
                "독서 문화 확산을 위한 '북멘토' 프로그램, 소외 지역 도서관 지원 사업, "
                "그리고 신인 작가 발굴 프로젝트 등을 통해 건강한 출판 생태계 조성에 기여하고 있습니다.\n\n"
                "앞으로도 YES24는 기술 혁신과 문화적 가치 창출을 통해 고객 여러분께 "
                "최고의 서비스를 제공하겠습니다. 감사합니다."
            ),
        },
        {
            "slug": "terms",
            "title": "이용약관",
            "content": (
                "제1조 (목적)\n"
                "이 약관은 YES24 주식회사(이하 '회사')가 제공하는 인터넷 관련 서비스(이하 '서비스')를 이용함에 있어 "
                "회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.\n\n"
                "제2조 (정의)\n"
                "① '서비스'란 회사가 제공하는 도서 판매, eBook, 공연 티켓 예매 등의 온라인 서비스를 말합니다.\n"
                "② '이용자'란 회사의 서비스에 접속하여 이 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.\n"
                "③ '회원'이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 서비스를 이용할 수 있는 자를 말합니다.\n\n"
                "제3조 (약관의 효력 및 변경)\n"
                "① 이 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.\n"
                "② 회사는 합리적인 사유가 발생할 경우에는 이 약관을 변경할 수 있으며, 약관이 변경되는 경우에는 "
                "적용일자 및 변경사유를 명시하여 현행약관과 함께 서비스 초기화면에 그 적용일자 7일 이전부터 공지합니다.\n\n"
                "제4조 (서비스의 제공 및 변경)\n"
                "① 회사는 다음과 같은 서비스를 제공합니다.\n"
                "  1. 도서 및 상품 판매 서비스\n"
                "  2. eBook 다운로드 및 스트리밍 서비스\n"
                "  3. 공연/전시 티켓 예매 서비스\n"
                "  4. 중고도서 거래 서비스\n"
                "  5. 기타 회사가 추가 개발하거나 다른 회사와의 제휴를 통해 제공하는 일체의 서비스\n\n"
                "제5조 (회원가입)\n"
                "① 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 "
                "함으로서 회원가입을 신청합니다.\n"
                "② 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 "
                "회원으로 등록합니다.\n\n"
                "제6조 (회원 탈퇴 및 자격 상실)\n"
                "① 회원은 회사에 언제든지 탈퇴를 요청할 수 있으며 회사는 즉시 회원탈퇴를 처리합니다.\n"
                "② 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다.\n\n"
                "제7조 (구매계약)\n"
                "① 이용자는 서비스 내에서 다음 방법에 의하여 구매를 신청합니다.\n"
                "  1. 상품 선택 및 수량 결정\n"
                "  2. 배송지 정보 입력\n"
                "  3. 결제 방법 선택 및 결제\n"
                "② 회사는 이용자의 구매 신청이 다음 각 호에 해당하면 승낙하지 않을 수 있습니다."
            ),
        },
        {
            "slug": "privacy",
            "title": "개인정보처리방침",
            "content": (
                "YES24 주식회사(이하 '회사')는 개인정보보호법 등 관련 법령상의 개인정보보호 규정을 준수하며, "
                "관련 법령에 의거한 개인정보처리방침을 정하여 이용자 권익 보호에 최선을 다하고 있습니다.\n\n"
                "1. 수집하는 개인정보의 항목\n"
                "회사는 회원가입, 서비스 이용 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.\n"
                "- 필수항목: 이메일, 비밀번호, 이름, 휴대폰번호\n"
                "- 선택항목: 생년월일, 성별, 관심분야\n"
                "- 자동수집항목: IP주소, 쿠키, 방문일시, 서비스 이용기록, 기기정보\n\n"
                "2. 개인정보의 수집 및 이용목적\n"
                "회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.\n"
                "- 서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산\n"
                "- 회원 관리: 회원제 서비스 이용에 따른 본인확인, 개인식별, 불량회원의 부정이용 방지\n"
                "- 마케팅 및 광고에 활용: 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 정보 및 참여기회 제공\n\n"
                "3. 개인정보의 보유 및 이용기간\n"
                "이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. "
                "단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계법령에서 정한 "
                "일정한 기간 동안 회원정보를 보관합니다.\n"
                "- 계약 또는 청약철회 등에 관한 기록: 5년\n"
                "- 대금결제 및 재화 등의 공급에 관한 기록: 5년\n"
                "- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년\n"
                "- 표시/광고에 관한 기록: 6개월\n\n"
                "4. 개인정보의 파기절차 및 방법\n"
                "회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.\n\n"
                "5. 개인정보 보호책임자\n"
                "회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 "
                "불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.\n"
                "- 개인정보 보호책임자: 홍길동\n"
                "- 연락처: privacy@yes24clone.com"
            ),
        },
        {
            "slug": "youth-policy",
            "title": "청소년보호정책",
            "content": (
                "YES24는 청소년이 건전한 인격체로 성장할 수 있도록 하기 위하여 정보통신망 이용촉진 및 "
                "정보보호 등에 관한 법률 및 청소년보호법에 근거하여 청소년보호정책을 수립, 시행하고 있습니다.\n\n"
                "1. 청소년 유해매체물 표시\n"
                "회사는 각 심의기관으로부터 청소년 유해매체물로 고시, 결정된 상품에 대해 청소년 유해매체물 "
                "표시를 하고 있으며, 청소년에게 해당 상품의 판매를 제한하고 있습니다.\n\n"
                "2. 청소년 유해매체물의 구매 제한\n"
                "회사는 청소년 유해매체물의 구매 시 성인인증 절차를 거쳐야만 구매가 가능하도록 하고 있습니다. "
                "만 19세 미만의 청소년이 해당 상품을 이용하고자 할 경우 법정대리인의 동의가 필요합니다.\n\n"
                "3. 청소년보호를 위한 활동\n"
                "회사는 청소년보호를 위해 다음과 같은 활동을 실시하고 있습니다.\n"
                "- 청소년 유해정보에 대한 청소년 접근 제한 및 관리 조치\n"
                "- 청소년 유해정보로부터 청소년을 보호하기 위한 기술적 조치\n"
                "- 청소년 유해정보에 대한 전담 직원 배치\n"
                "- 청소년 유해정보 신고센터 운영\n\n"
                "4. 청소년보호 책임자\n"
                "- 청소년보호 책임자: 김보호\n"
                "- 연락처: youth@yes24clone.com\n\n"
                "회사는 앞으로도 청소년 보호를 위해 최선의 노력을 다하겠습니다."
            ),
        },
        {
            "slug": "book-promotion",
            "title": "도서홍보안내",
            "content": (
                "YES24 도서 홍보 서비스 안내\n\n"
                "YES24는 출판사와 저자를 위한 다양한 도서 홍보 서비스를 제공하고 있습니다. "
                "국내 최대 온라인 서점의 트래픽과 데이터 분석 역량을 바탕으로 효과적인 도서 마케팅을 지원합니다.\n\n"
                "1. 배너 광고\n"
                "YES24 메인 페이지, 카테고리 페이지, 상세 페이지 등 다양한 영역에 배너 광고를 게재할 수 있습니다. "
                "타겟 독자층에 맞춘 정밀한 노출이 가능하며, 실시간 클릭률 및 전환율 데이터를 제공합니다.\n\n"
                "2. 기획전 참여\n"
                "테마별, 시즌별 기획전에 도서를 등록하여 집중적인 노출 효과를 얻을 수 있습니다. "
                "기획전 참여 도서는 할인 프로모션과 연계하여 판매량 증대 효과를 기대할 수 있습니다.\n\n"
                "3. 뉴스레터 홍보\n"
                "YES24의 뉴스레터를 통해 수백만 구독자에게 도서 정보를 전달할 수 있습니다. "
                "관심사 기반 세그먼트 발송으로 높은 오픈율과 클릭률을 달성합니다.\n\n"
                "4. SNS 마케팅\n"
                "YES24의 공식 SNS 채널(인스타그램, 유튜브, 페이스북, 트위터)을 활용한 "
                "도서 리뷰, 저자 인터뷰, 북트레일러 등 다양한 콘텐츠 마케팅을 지원합니다.\n\n"
                "5. 독자 리뷰 프로모션\n"
                "서평단 모집 및 운영을 통해 양질의 도서 리뷰를 확보할 수 있습니다. "
                "리뷰어 선정부터 리뷰 관리까지 원스톱 서비스를 제공합니다.\n\n"
                "문의: promotion@yes24clone.com\n"
                "전화: 02-1234-5678 (평일 09:00~18:00)"
            ),
        },
        {
            "slug": "ad-info",
            "title": "광고안내",
            "content": (
                "YES24 광고 상품 안내\n\n"
                "YES24는 월 방문자 수 2,000만 명 이상의 국내 최대 도서/문화 플랫폼입니다. "
                "높은 구매 전환율과 정확한 타겟팅을 통해 광고주님의 마케팅 목표를 달성하도록 지원합니다.\n\n"
                "주요 광고 상품\n\n"
                "1. 디스플레이 광고\n"
                "- 메인 배너: 1일 노출 약 500만 임프레션, 높은 인지도 확보에 효과적\n"
                "- 카테고리 배너: 특정 관심사 독자층에 정밀 타겟팅 가능\n"
                "- 모바일 배너: 모바일 트래픽 비중 70% 이상, 모바일 전용 광고 상품\n\n"
                "2. 검색 광고\n"
                "- 키워드 검색 시 상단 노출, CPC(클릭당 과금) 방식\n"
                "- 도서명, 저자명, 장르명 등 다양한 키워드 설정 가능\n\n"
                "3. 네이티브 광고\n"
                "- 콘텐츠 형식의 자연스러운 광고, 높은 engagement 달성\n"
                "- 에디터 추천, 큐레이션 리스트 등 다양한 포맷 제공\n\n"
                "4. 이메일 광고\n"
                "- 500만 구독자 대상 뉴스레터 광고\n"
                "- 관심사 기반 세그먼트 발송으로 높은 효율\n\n"
                "광고 문의: ad@yes24clone.com\n"
                "전화: 02-1234-5679 (평일 09:00~18:00)"
            ),
        },
        {
            "slug": "partnership",
            "title": "제휴안내",
            "content": (
                "YES24 제휴 파트너십 안내\n\n"
                "YES24는 다양한 기업 및 기관과의 전략적 제휴를 통해 상호 성장하는 파트너십을 구축하고 있습니다. "
                "도서/문화 분야의 시너지를 창출할 수 있는 제휴를 환영합니다.\n\n"
                "제휴 분야\n\n"
                "1. 콘텐츠 제휴\n"
                "출판사, 작가, 크리에이터와의 콘텐츠 제휴를 통해 독점 콘텐츠 및 선출간 서비스를 제공합니다. "
                "eBook, 오디오북 등 디지털 콘텐츠 분야의 제휴도 적극 추진하고 있습니다.\n\n"
                "2. 마케팅 제휴\n"
                "크로스 프로모션, 공동 기획전, 번들 상품 등 다양한 형태의 마케팅 제휴가 가능합니다. "
                "양사의 고객 기반을 활용한 효과적인 마케팅을 실현합니다.\n\n"
                "3. 기술 제휴\n"
                "API 연동, 데이터 공유, 시스템 통합 등 기술적 제휴를 통해 서비스 확장이 가능합니다. "
                "도서 정보 API, 주문 연동 API 등을 제공하고 있습니다.\n\n"
                "4. 복지몰 제휴\n"
                "기업, 기관의 임직원 복지몰에 YES24 서비스를 입점시켜 도서 구매 혜택을 제공합니다.\n\n"
                "5. 교육 제휴\n"
                "학교, 학원, 교육기관과의 제휴를 통해 교재 공급 및 교육 콘텐츠를 제공합니다.\n\n"
                "제휴 문의: partner@yes24clone.com"
            ),
        },
        {
            "slug": "careers",
            "title": "인재채용",
            "content": (
                "YES24 인재채용 안내\n\n"
                "YES24는 대한민국 문화 유통의 미래를 함께 만들어갈 열정적인 인재를 찾고 있습니다. "
                "도전적이고 창의적인 환경에서 함께 성장할 동료를 기다립니다.\n\n"
                "채용 분야\n\n"
                "1. 개발 직군\n"
                "- 백엔드 개발: Python, Java, Go 기반의 대규모 트래픽 처리 시스템 개발\n"
                "- 프론트엔드 개발: React, Next.js 기반의 사용자 인터페이스 개발\n"
                "- 데이터 엔지니어: 대규모 데이터 파이프라인 구축 및 분석 시스템 개발\n"
                "- 모바일 개발: iOS/Android 앱 개발 및 유지보수\n"
                "- 인프라/DevOps: 클라우드 인프라 관리 및 CI/CD 파이프라인 구축\n\n"
                "2. 기획/마케팅 직군\n"
                "- 서비스 기획: 신규 서비스 기획 및 UX 설계\n"
                "- 마케팅: 온라인/오프라인 마케팅 전략 수립 및 실행\n"
                "- 콘텐츠 기획: 도서/문화 콘텐츠 큐레이션 및 기획전 운영\n"
                "- 상품 기획: MD 운영 및 상품 소싱\n\n"
                "3. 경영지원 직군\n"
                "- 재무/회계, 인사/총무, 법무 등\n\n"
                "복리후생\n"
                "- 유연근무제 (시차출퇴근, 재택근무)\n"
                "- 도서 구매 지원 (월 10만원)\n"
                "- 자기계발비 지원 (연 100만원)\n"
                "- 건강검진, 경조사 지원, 동호회 활동비 지원\n"
                "- 스톡옵션 제도 운영\n\n"
                "지원 방법: careers@yes24clone.com으로 이력서를 보내주세요."
            ),
        },
        {
            "slug": "store-info",
            "title": "매장안내",
            "content": (
                "YES24 오프라인 매장 안내\n\n"
                "YES24는 온라인뿐만 아니라 전국 주요 도시에 오프라인 매장을 운영하고 있습니다. "
                "직접 책을 보고 고르는 즐거움을 경험해 보세요.\n\n"
                "1. YES24 강남점\n"
                "- 주소: 서울특별시 강남구 테헤란로 152\n"
                "- 영업시간: 10:00~22:00 (연중무휴)\n"
                "- 전화: 02-555-2424\n"
                "- 특징: 3층 규모의 대형 서점, 북카페 병설, 저자 사인회 정기 개최\n\n"
                "2. YES24 종로점\n"
                "- 주소: 서울특별시 종로구 종로 33\n"
                "- 영업시간: 10:00~22:00 (연중무휴)\n"
                "- 전화: 02-733-2424\n"
                "- 특징: 인문/사회과학 전문 코너, 독립출판 코너 운영\n\n"
                "3. YES24 해운대점\n"
                "- 주소: 부산광역시 해운대구 해운대로 456\n"
                "- 영업시간: 10:00~21:00 (연중무휴)\n"
                "- 전화: 051-742-2424\n"
                "- 특징: 오션뷰 북카페, 여행/서핑 도서 특화\n\n"
                "4. YES24 대전점\n"
                "- 주소: 대전광역시 유성구 대학로 99\n"
                "- 영업시간: 10:00~21:00 (연중무휴)\n"
                "- 전화: 042-821-2424\n"
                "- 특징: 과학/IT 도서 특화, 대학생 할인 상시 운영\n\n"
                "5. YES24 판교점\n"
                "- 주소: 경기도 성남시 분당구 판교역로 235\n"
                "- 영업시간: 10:00~22:00 (연중무휴)\n"
                "- 전화: 031-701-2424\n"
                "- 특징: IT/비즈니스 도서 전문, 코워킹 스페이스 병설\n\n"
                "모든 매장에서 온라인 주문 픽업 서비스를 이용하실 수 있습니다."
            ),
        },
        {
            "slug": "welfare",
            "title": "복지제휴",
            "content": (
                "YES24 복지제휴 서비스 안내\n\n"
                "YES24는 기업, 공공기관, 학교 등과의 복지제휴를 통해 임직원 및 구성원에게 "
                "특별한 도서 구매 혜택을 제공하고 있습니다.\n\n"
                "제휴 혜택\n\n"
                "1. 도서 할인\n"
                "- 제휴사 임직원 대상 추가 할인 (최대 15%)\n"
                "- 분기별 특별 할인 기획전 운영\n"
                "- 대량 구매 시 추가 할인 협의 가능\n\n"
                "2. 포인트 적립\n"
                "- 기본 적립률 5%에 추가 적립 (최대 3% 추가)\n"
                "- 제휴사 전용 포인트 이벤트 수시 진행\n\n"
                "3. 무료 배송\n"
                "- 제휴사 임직원 주문 시 무료 배송 (최소 주문금액 없음)\n"
                "- 사무실 대량 배송 서비스 제공\n\n"
                "4. 전용 혜택\n"
                "- 제휴사 전용 기획전 운영\n"
                "- 신간 도서 우선 안내 서비스\n"
                "- 도서 큐레이션 서비스 (분야별 추천 도서 리스트 제공)\n\n"
                "5. 법인 결제\n"
                "- 법인카드, 계좌이체 등 법인 결제 수단 지원\n"
                "- 월 단위 통합 정산 가능\n"
                "- 세금계산서 자동 발행\n\n"
                "현재 제휴 기관: 삼성, LG, 현대, SK, 롯데 등 500개 이상의 기업 및 기관\n\n"
                "제휴 문의: welfare@yes24clone.com\n"
                "전화: 02-1234-5680 (평일 09:00~18:00)"
            ),
        },
    ]

    CATEGORY_MAP = {
        "about": "company", "terms": "legal", "privacy": "legal",
        "youth-policy": "legal", "book-promotion": "service", "ad-info": "service",
        "partnership": "service", "careers": "company", "store-info": "company",
        "welfare": "service",
    }

    for idx, page in enumerate(pages):
        await session.execute(
            text("""
                INSERT INTO static_pages (slug, title, content, category, display_order)
                VALUES (:slug, :title, :content, :category, :display_order)
                ON CONFLICT (slug) DO NOTHING
            """),
            {**page, "category": CATEGORY_MAP.get(page["slug"], "company"), "display_order": idx},
        )
    await session.commit()
    print(f"Static pages seeded: {len(pages)} pages.")


async def seed_faq(session: AsyncSession):
    print("Seeding FAQ...")

    faq_items = [
        # 주문/결제
        ("주문/결제", "주문은 어떻게 하나요?", "YES24에서 원하시는 상품을 장바구니에 담은 후, 주문서 작성 페이지에서 배송지 정보와 결제 수단을 선택하여 결제하시면 됩니다. 비회원도 주문이 가능하지만, 회원으로 가입하시면 포인트 적립 등 다양한 혜택을 받으실 수 있습니다."),
        ("주문/결제", "결제 수단은 어떤 것이 있나요?", "신용카드, 체크카드, 실시간 계좌이체, 무통장입금, 휴대폰 결제, YES포인트, 문화상품권, 도서문화상품권, 카카오페이, 네이버페이 등 다양한 결제 수단을 이용하실 수 있습니다. 복합 결제도 가능합니다."),
        ("주문/결제", "주문 취소는 어떻게 하나요?", "마이페이지 > 주문내역에서 '주문취소' 버튼을 눌러 취소하실 수 있습니다. 단, 이미 발송된 상품은 취소가 불가하며 반품 절차를 통해 처리해 주셔야 합니다. 무통장입금의 경우 입금 전 취소 시 자동으로 처리됩니다."),
        ("주문/결제", "주문 내역은 어디서 확인하나요?", "로그인 후 마이페이지 > 주문내역에서 확인하실 수 있습니다. 비회원 주문의 경우 '비회원 주문조회' 메뉴에서 주문번호와 주문 시 입력한 정보로 조회 가능합니다."),
        ("주문/결제", "세금계산서 발행이 가능한가요?", "네, 가능합니다. 주문 시 결제 페이지에서 '세금계산서 발행'을 선택하시고 사업자 정보를 입력해 주시면 됩니다. 주문 완료 후에도 마이페이지에서 신청하실 수 있습니다."),
        ("주문/결제", "해외에서도 주문할 수 있나요?", "네, 해외 배송 서비스를 제공하고 있습니다. 다만 해외 배송 시 별도의 배송비가 부과되며, 배송 기간은 지역에 따라 7~21일 정도 소요됩니다. 일부 상품은 해외 배송이 제한될 수 있습니다."),
        ("주문/결제", "할인 쿠폰은 어떻게 사용하나요?", "주문서 작성 시 '쿠폰 적용' 영역에서 보유하신 쿠폰을 선택하여 적용하실 수 있습니다. 쿠폰은 상품별, 카테고리별로 적용 조건이 다를 수 있으니 쿠폰 상세 내용을 확인해 주세요."),
        # 배송
        ("배송", "배송은 얼마나 걸리나요?", "일반 배송은 결제 완료 후 1~3일(영업일 기준) 내에 배송됩니다. 품절/절판 도서의 경우 입고까지 추가 시간이 소요될 수 있습니다. 도서 산간 지역은 1~2일 추가 소요됩니다."),
        ("배송", "무료 배송 기준이 어떻게 되나요?", "도서 상품은 1만원 이상 구매 시 무료 배송됩니다. 음반, DVD, 문구 등 비도서 상품의 경우 2만원 이상 구매 시 무료 배송됩니다. 도서와 비도서를 함께 주문하는 경우 합산 금액으로 판단합니다."),
        ("배송", "당일 배송이 가능한가요?", "서울 및 수도권 일부 지역에 한해 오전 11시 이전 주문 건에 대해 당일 배송 서비스를 제공하고 있습니다. 당일 배송 가능 상품에는 '오늘 도착' 마크가 표시됩니다."),
        ("배송", "배송 조회는 어떻게 하나요?", "마이페이지 > 주문내역에서 해당 주문의 '배송조회' 버튼을 클릭하시면 실시간으로 배송 상태를 확인하실 수 있습니다. 송장번호가 등록되면 SMS/이메일로도 안내드립니다."),
        ("배송", "배송지를 변경할 수 있나요?", "상품 발송 전이라면 마이페이지 > 주문내역에서 배송지를 변경하실 수 있습니다. 이미 발송된 경우에는 변경이 불가하며, 택배사에 직접 문의하시거나 반품 후 재주문해 주셔야 합니다."),
        ("배송", "해외 배송료는 얼마인가요?", "해외 배송료는 지역과 무게에 따라 다릅니다. 아시아 지역은 기본 15,000원부터, 미주/유럽 지역은 25,000원부터 시작합니다. 정확한 배송료는 주문서 작성 시 자동으로 계산됩니다."),
        ("배송", "편의점 수령이 가능한가요?", "네, GS25, CU, 세븐일레븐 등 주요 편의점에서 수령하실 수 있습니다. 주문 시 배송 방법에서 '편의점 수령'을 선택하고 원하는 편의점을 지정해 주세요."),
        # 반품/교환
        ("반품/교환", "반품은 어떻게 하나요?", "상품 수령 후 7일 이내에 마이페이지 > 주문내역에서 '반품신청'을 해주시면 됩니다. 반품 접수 후 택배 기사가 방문하여 수거하며, 상품 확인 후 환불 처리됩니다. 단, 고객 변심에 의한 반품 시 왕복 택배비가 부과됩니다."),
        ("반품/교환", "교환은 어떻게 하나요?", "파본이나 오배송의 경우 무료로 교환해 드립니다. 마이페이지 > 주문내역에서 '교환신청'을 해주시면 됩니다. 동일 상품으로의 교환은 무료이며, 다른 상품으로의 교환은 반품 후 재주문을 권장드립니다."),
        ("반품/교환", "환불은 언제 되나요?", "반품 상품이 도착하여 검수가 완료된 후 처리됩니다. 신용카드 결제의 경우 취소 후 3~7영업일, 계좌이체의 경우 1~3영업일 내에 환불됩니다. 포인트 결제분은 즉시 복원됩니다."),
        ("반품/교환", "반품이 불가능한 경우가 있나요?", "다음의 경우 반품이 불가합니다: 수령 후 7일이 경과한 경우, 포장을 훼손한 경우, CD/DVD 등의 포장을 개봉한 경우, eBook 다운로드 후, 고객의 사용 또는 일부 소비에 의해 상품의 가치가 감소한 경우."),
        ("반품/교환", "파본 도서를 받았는데 어떻게 하나요?", "파본(인쇄 불량, 제본 불량 등) 도서를 수령하신 경우 고객센터(1544-2424)로 연락해 주시면 무료로 교환 처리해 드립니다. 사진을 함께 보내주시면 더 빠르게 처리됩니다."),
        # 회원
        ("회원", "회원가입은 어떻게 하나요?", "YES24 홈페이지 우측 상단의 '회원가입' 버튼을 클릭하시면 됩니다. 이메일, 이름, 비밀번호 등 기본 정보를 입력하시면 간편하게 가입하실 수 있습니다. 소셜 로그인(카카오, 네이버, 구글)도 지원합니다."),
        ("회원", "비밀번호를 잊어버렸어요.", "로그인 페이지에서 '비밀번호 찾기'를 클릭하신 후 가입 시 등록한 이메일을 입력해 주세요. 비밀번호 재설정 링크가 이메일로 발송됩니다. 이메일을 받지 못한 경우 스팸함을 확인해 주세요."),
        ("회원", "회원 등급은 어떻게 결정되나요?", "최근 3개월간의 구매 금액에 따라 SILVER(0원~), GOLD(10만원~), PLATINUM(30만원~), VIP(50만원~)로 결정됩니다. 등급은 매월 1일에 갱신되며, 등급별로 추가 할인 및 포인트 적립 혜택이 제공됩니다."),
        ("회원", "회원 탈퇴는 어떻게 하나요?", "마이페이지 > 회원정보 > 회원탈퇴에서 탈퇴하실 수 있습니다. 탈퇴 시 보유 포인트와 쿠폰은 모두 소멸되며, 동일 이메일로 재가입 시 30일의 제한 기간이 있습니다. 처리 중인 주문이 있는 경우 탈퇴가 제한됩니다."),
        ("회원", "개인정보를 변경하고 싶어요.", "마이페이지 > 회원정보수정에서 이름, 휴대폰번호, 주소 등의 개인정보를 변경하실 수 있습니다. 이메일(아이디)은 변경이 불가하며, 변경이 필요한 경우 고객센터로 문의해 주세요."),
        ("회원", "소셜 로그인은 어떻게 연동하나요?", "마이페이지 > 계정설정에서 카카오, 네이버, 구글 계정을 연동하실 수 있습니다. 연동 후에는 해당 소셜 계정으로 간편하게 로그인하실 수 있습니다."),
        # eBook
        ("eBook", "eBook은 어떻게 읽나요?", "구매하신 eBook은 YES24 eBook 리더 앱(iOS/Android)에서 읽으실 수 있습니다. 앱 설치 후 YES24 계정으로 로그인하시면 구매한 eBook이 자동으로 동기화됩니다. PC에서는 웹 리더를 통해 읽으실 수 있습니다."),
        ("eBook", "eBook 환불이 가능한가요?", "eBook은 다운로드 전에는 환불이 가능합니다. 다운로드 또는 열람 후에는 환불이 불가합니다. 단, 파일 오류 등의 기술적 문제가 있는 경우에는 고객센터를 통해 환불 처리가 가능합니다."),
        ("eBook", "eBook을 여러 기기에서 읽을 수 있나요?", "네, 최대 5대의 기기에서 동시에 이용하실 수 있습니다. 스마트폰, 태블릿, PC 등 다양한 기기에서 이용 가능하며, 마지막으로 읽은 위치가 자동으로 동기화됩니다."),
        ("eBook", "eBook 대여 서비스가 있나요?", "네, 일부 eBook은 대여 서비스를 이용하실 수 있습니다. 대여 기간은 보통 7일이며, 대여 가격은 구매 가격의 40~60% 수준입니다. 대여 가능한 도서에는 '대여' 마크가 표시됩니다."),
        ("eBook", "오프라인에서도 eBook을 읽을 수 있나요?", "네, eBook 리더 앱에서 도서를 미리 다운로드해 두시면 인터넷 연결 없이도 읽으실 수 있습니다. 다만 최초 다운로드 시에는 인터넷 연결이 필요합니다."),
        ("eBook", "eBook 리더 앱의 기능이 궁금해요.", "YES24 eBook 리더 앱은 글꼴/크기 변경, 배경색 변경(주간/야간 모드), 밑줄/메모 기능, 목차 바로가기, 북마크, 텍스트 검색, 사전 연동 등의 기능을 제공합니다."),
        # 포인트
        ("포인트", "포인트는 어떻게 적립되나요?", "상품 구매 시 결제 금액의 5%가 YES포인트로 적립됩니다. 등급별로 추가 적립률이 적용되며(GOLD 1%, PLATINUM 2%, VIP 3%), 특정 이벤트 기간에는 추가 적립 혜택이 제공됩니다. 포인트는 구매 확정 후 적립됩니다."),
        ("포인트", "포인트 사용 방법이 궁금해요.", "결제 시 1포인트 = 1원으로 사용하실 수 있습니다. 최소 1,000포인트부터 사용 가능하며, 결제 금액의 최대 50%까지 포인트로 결제하실 수 있습니다. eBook, 공연 티켓 등 일부 상품에는 사용이 제한될 수 있습니다."),
        ("포인트", "포인트 유효기간이 있나요?", "YES포인트의 유효기간은 적립일로부터 1년입니다. 유효기간이 임박한 포인트는 마이페이지에서 확인하실 수 있으며, 소멸 30일 전 알림을 보내드립니다."),
        ("포인트", "포인트가 적립되지 않았어요.", "포인트는 상품 수령 후 구매 확정 시점에 적립됩니다. 자동 구매 확정은 수령 후 7일 후에 처리됩니다. 반품/환불 시 적립된 포인트는 차감됩니다. 그래도 문제가 있으시면 고객센터로 문의해 주세요."),
        ("포인트", "포인트를 선물할 수 있나요?", "현재 포인트 선물 기능은 제공하지 않고 있습니다. 다만 도서 상품권을 구매하여 선물하시면 수령인이 사용 후 포인트를 적립받으실 수 있습니다."),
        # 기타
        ("기타", "고객센터 운영 시간이 어떻게 되나요?", "고객센터는 평일 09:00~18:00에 운영됩니다(점심시간 12:00~13:00 제외). 전화 상담은 1544-2424, 이메일 상담은 help@yes24clone.com으로 문의해 주세요. 카카오톡 채널 '예스24'로도 상담 가능합니다."),
        ("기타", "매장에서도 온라인 가격으로 구매할 수 있나요?", "YES24 오프라인 매장에서는 매장 자체 할인가가 적용됩니다. 온라인 할인 쿠폰은 오프라인 매장에서 사용이 불가하며, 반대로 매장 전용 쿠폰은 온라인에서 사용할 수 없습니다."),
        ("기타", "도서 검색이 잘 안 됩니다.", "검색 시 도서 제목, 저자명, 출판사명, ISBN 등으로 검색하실 수 있습니다. 정확한 검색 결과를 얻기 위해 띄어쓰기를 정확히 입력하시거나, 핵심 키워드만 입력해 보세요. 그래도 찾으시는 도서가 검색되지 않으면 고객센터로 문의해 주세요."),
        ("기타", "앱을 설치하고 싶어요.", "YES24 앱은 Apple App Store(iOS) 또는 Google Play Store(Android)에서 'YES24'를 검색하여 설치하실 수 있습니다. 앱 설치 시 첫 구매 할인 쿠폰을 드립니다."),
        ("기타", "위시리스트는 몇 개까지 등록할 수 있나요?", "위시리스트에는 최대 1,000개의 상품을 등록하실 수 있습니다. 위시리스트에 등록한 상품이 할인되거나 재입고되면 알림을 보내드립니다."),
        ("기타", "리뷰 작성 시 혜택이 있나요?", "도서 리뷰 작성 시 YES포인트가 적립됩니다. 텍스트 리뷰 200포인트, 포토 리뷰 500포인트가 적립되며, 매월 우수 리뷰어에게는 추가 포인트와 도서 상품권이 제공됩니다."),
        ("기타", "대량 구매 할인이 가능한가요?", "학교, 기업, 단체 등에서 대량 구매 시 별도의 할인을 적용해 드립니다. 10권 이상 구매 시 5%, 50권 이상 10%, 100권 이상 15%의 추가 할인이 적용됩니다. 자세한 사항은 법인영업팀(biz@yes24clone.com)으로 문의해 주세요."),
        ("기타", "중고 도서를 판매할 수 있나요?", "YES24 중고매장에서 중고 도서를 판매하실 수 있습니다. 마이페이지 > 중고판매에서 판매하실 도서의 ISBN을 입력하면 예상 매입가를 확인하실 수 있습니다. 매입 완료 후 YES포인트 또는 계좌로 정산됩니다."),
    ]

    # Check if already seeded
    result = await session.execute(text("SELECT COUNT(*) FROM faq_items"))
    existing = result.scalar() or 0
    if existing > 0:
        print(f"Already have {existing} FAQ items, skipping.")
        return

    for idx, (category, question, answer) in enumerate(faq_items):
        await session.execute(
            text("""
                INSERT INTO faq_items (category, question, answer, display_order)
                VALUES (:category, :question, :answer, :display_order)
            """),
            {
                "category": category,
                "question": question,
                "answer": answer,
                "display_order": idx,
            },
        )
    await session.commit()
    print(f"FAQ seeded: {len(faq_items)} items.")


async def seed_coupons(session: AsyncSession):
    print("Seeding coupons...")

    today = date.today()
    coupons = [
        {"code": "WELCOME10", "name": "신규회원 10% 할인", "discount_type": "PERCENT", "discount_value": 10, "min_order_amount": 15000, "max_discount": 5000},
        {"code": "WELCOME5000", "name": "신규회원 5,000원 할인", "discount_type": "FIXED", "discount_value": 5000, "min_order_amount": 20000, "max_discount": None},
        {"code": "SPRING2026", "name": "봄맞이 15% 할인쿠폰", "discount_type": "PERCENT", "discount_value": 15, "min_order_amount": 20000, "max_discount": 10000},
        {"code": "BOOK3000", "name": "도서 3,000원 할인", "discount_type": "FIXED", "discount_value": 3000, "min_order_amount": 15000, "max_discount": None},
        {"code": "VIP20", "name": "VIP 전용 20% 할인", "discount_type": "PERCENT", "discount_value": 20, "min_order_amount": 30000, "max_discount": 15000},
        {"code": "WEEKEND7", "name": "주말 특별 7% 할인", "discount_type": "PERCENT", "discount_value": 7, "min_order_amount": 10000, "max_discount": 3000},
        {"code": "EBOOK50", "name": "eBook 50% 할인", "discount_type": "PERCENT", "discount_value": 50, "min_order_amount": 5000, "max_discount": 10000},
        {"code": "FIRST2000", "name": "첫 구매 2,000원 할인", "discount_type": "FIXED", "discount_value": 2000, "min_order_amount": 10000, "max_discount": None},
        {"code": "BIRTHDAY15", "name": "생일축하 15% 할인", "discount_type": "PERCENT", "discount_value": 15, "min_order_amount": 10000, "max_discount": 8000},
        {"code": "FREESHIP", "name": "무료배송 쿠폰", "discount_type": "FIXED", "discount_value": 2500, "min_order_amount": 5000, "max_discount": None},
        {"code": "IT10", "name": "IT도서 10% 할인", "discount_type": "PERCENT", "discount_value": 10, "min_order_amount": 20000, "max_discount": 5000},
        {"code": "KIDS20", "name": "어린이 도서 20% 할인", "discount_type": "PERCENT", "discount_value": 20, "min_order_amount": 15000, "max_discount": 8000},
        {"code": "REVIEW500", "name": "리뷰 작성 감사 500원", "discount_type": "FIXED", "discount_value": 500, "min_order_amount": 5000, "max_discount": None},
        {"code": "APP1000", "name": "앱 전용 1,000원 할인", "discount_type": "FIXED", "discount_value": 1000, "min_order_amount": 10000, "max_discount": None},
        {"code": "PLATINUM10", "name": "PLATINUM 10% 할인", "discount_type": "PERCENT", "discount_value": 10, "min_order_amount": 20000, "max_discount": 7000},
        {"code": "GOLD8", "name": "GOLD 8% 할인", "discount_type": "PERCENT", "discount_value": 8, "min_order_amount": 15000, "max_discount": 5000},
        {"code": "SUMMER2026", "name": "여름 특별 12% 할인", "discount_type": "PERCENT", "discount_value": 12, "min_order_amount": 20000, "max_discount": 8000},
        {"code": "BULK5", "name": "3권 이상 구매 시 5% 추가 할인", "discount_type": "PERCENT", "discount_value": 5, "min_order_amount": 30000, "max_discount": 5000},
        {"code": "NIGHTOWL", "name": "야간 특별 10% 할인 (22시~06시)", "discount_type": "PERCENT", "discount_value": 10, "min_order_amount": 15000, "max_discount": 5000},
        {"code": "ESSAY3000", "name": "에세이 3,000원 할인", "discount_type": "FIXED", "discount_value": 3000, "min_order_amount": 12000, "max_discount": None},
    ]

    for coupon in coupons:
        start = today - timedelta(days=random.randint(0, 30))
        end = start + timedelta(days=random.randint(30, 180))
        await session.execute(
            text("""
                INSERT INTO coupons (code, name, discount_type, discount_value, min_order_amount, max_discount, start_date, end_date, is_active)
                VALUES (:code, :name, :discount_type, :discount_value, :min_order_amount, :max_discount, :start_date, :end_date, :is_active)
                ON CONFLICT (code) DO NOTHING
            """),
            {
                **coupon,
                "start_date": datetime(start.year, start.month, start.day, tzinfo=timezone.utc),
                "end_date": datetime(end.year, end.month, end.day, tzinfo=timezone.utc),
                "is_active": True,
            },
        )
    await session.commit()
    print(f"Coupons seeded: {len(coupons)} coupons.")


async def seed_more_orders(session: AsyncSession):
    print("Seeding 3000 additional orders...")
    statuses = ["PENDING", "PAID", "SHIPPING", "DELIVERED", "DELIVERED", "DELIVERED", "CANCELLED"]
    today = date.today()

    result = await session.execute(text("SELECT id, sale_price FROM products LIMIT 5000"))
    products = result.all()
    if not products:
        print("No products found, skipping additional orders.")
        return

    # Check existing order count to avoid duplicates on re-run
    result = await session.execute(text("SELECT COUNT(*) FROM orders"))
    existing_count = result.scalar() or 0
    if existing_count >= 5000:
        print(f"Already have {existing_count} orders, skipping additional orders.")
        return

    target = 5000 - existing_count
    target = min(target, 3000)
    print(f"  Creating {target} additional orders (existing: {existing_count})...")

    for i in range(target):
        user_id = random.randint(1, NUM_USERS)
        order_date = today - timedelta(days=random.randint(0, 730))
        order_no = f"YS{order_date.strftime('%Y%m%d')}{random.randint(100000, 999999)}"
        num_items = random.choices([1, 2, 3, 4, 5], weights=[40, 30, 15, 10, 5], k=1)[0]
        items = random.sample(products, min(num_items, len(products)))
        total = sum(p[1] * random.randint(1, 3) for p in items)

        await session.execute(
            text("""
                INSERT INTO orders (order_no, user_id, total_amount, status, shipping_addr, created_at)
                VALUES (:order_no, :user_id, :total_amount, :status, :shipping_addr, :created_at)
                ON CONFLICT (order_no) DO NOTHING
            """),
            {
                "order_no": order_no,
                "user_id": user_id,
                "total_amount": total,
                "status": random.choice(statuses),
                "shipping_addr": fake.address(),
                "created_at": datetime(order_date.year, order_date.month, order_date.day, tzinfo=timezone.utc),
            },
        )

        # Get order id and insert items
        res = await session.execute(
            text("SELECT id FROM orders WHERE order_no = :order_no"), {"order_no": order_no}
        )
        order_row = res.first()
        if order_row:
            for prod_id, sale_price in items:
                qty = random.randint(1, 3)
                await session.execute(
                    text("""
                        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                        VALUES (:order_id, :product_id, :quantity, :unit_price)
                    """),
                    {
                        "order_id": order_row[0],
                        "product_id": prod_id,
                        "quantity": qty,
                        "unit_price": sale_price,
                    },
                )

        if i % 500 == 0:
            await session.commit()
            if i > 0:
                print(f"  ... {i} orders created")

    await session.commit()
    print(f"Additional orders seeded: {target} orders.")


async def seed_qna(session: AsyncSession):
    """Seed 5-10 Q&As per popular product."""
    print("Seeding product Q&A...")

    # Get top 500 products (most popular)
    result = await session.execute(
        text("SELECT id FROM products ORDER BY sales_index DESC LIMIT 500")
    )
    product_ids = [r[0] for r in result.all()]
    if not product_ids:
        print("No products found, skipping Q&A.")
        return

    result = await session.execute(text("SELECT id, username FROM users LIMIT 200"))
    users = [(r[0], r[1]) for r in result.all()]
    if not users:
        print("No users found, skipping Q&A.")
        return

    QNA_QUESTIONS = [
        ("배송 기간이 얼마나 걸리나요?", "주문 후 배송까지 보통 며칠 정도 소요되는지 궁금합니다."),
        ("이 책 개정판 나올 예정인가요?", "혹시 개정판이 나올 예정이 있는지 알고 싶습니다."),
        ("목차에 없는 내용도 포함되어 있나요?", "목차 외에 추가적인 부록이나 별첨 자료가 있는지 궁금합니다."),
        ("입문자가 읽기에 적합한가요?", "해당 분야를 처음 접하는 사람이 읽기에 난이도가 어떤지 알고 싶습니다."),
        ("전자책으로도 출간되어 있나요?", "eBook 버전이 있는지 확인하고 싶습니다."),
        ("사은품이 아직 남아있나요?", "사은품 증정 이벤트가 아직 진행 중인지 궁금합니다."),
        ("선물용으로 포장이 가능한가요?", "선물용으로 별도 포장을 해주시는지 알고 싶습니다."),
        ("번역 품질이 어떤가요?", "원서를 읽어봤는데 번역본의 품질이 궁금합니다."),
        ("이 시리즈의 다른 책도 있나요?", "같은 시리즈의 다른 권도 판매하고 있는지 알고 싶습니다."),
        ("품절된 책 재입고 예정이 있나요?", "품절 상태인데 재입고 예정일을 알 수 있을까요?"),
        ("대량 구매 할인이 가능한가요?", "단체 구매나 대량 구매 시 별도 할인이 가능한지 문의드립니다."),
        ("저자 사인본이 있나요?", "저자 사인본 판매 여부가 궁금합니다."),
    ]

    QNA_ANSWERS = [
        "안녕하세요, YES24입니다. 일반적으로 주문 후 1~2영업일 내에 출고되며, 출고 후 1~2일 이내에 수령 가능합니다.",
        "안녕하세요. 현재 개정판 출간 예정은 확인되지 않고 있습니다. 출판사에 문의하시면 더 정확한 안내를 받으실 수 있습니다.",
        "안녕하세요. 해당 도서에는 목차에 표기된 내용 외에 별도 부록이 포함되어 있습니다. 상세 내용은 도서 정보를 참고해 주세요.",
        "안녕하세요. 해당 도서는 입문자도 쉽게 읽을 수 있도록 구성되어 있습니다. 기초부터 차근차근 설명하고 있어 추천드립니다.",
        "안녕하세요. 현재 eBook 버전은 별도로 판매되고 있습니다. eBook 카테고리에서 검색하시면 확인하실 수 있습니다.",
        "안녕하세요. 사은품은 소진 시 종료되며, 현재 재고 상황은 실시간으로 변동됩니다. 주문 시점에 재고가 있으면 함께 발송됩니다.",
    ]

    count = 0
    for prod_id in product_ids:
        num_qna = random.randint(3, 10)
        for _ in range(num_qna):
            user_id, _ = random.choice(users)
            q_title, q_body = random.choice(QNA_QUESTIONS)
            is_secret = random.random() < 0.2
            is_answered = random.random() < 0.6
            answer = random.choice(QNA_ANSWERS) if is_answered else None
            created = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 365))
            answered_at = created + timedelta(days=random.randint(1, 7)) if is_answered else None

            await session.execute(
                text("""
                    INSERT INTO product_qna (
                        product_id, user_id, question_title, question_body,
                        answer_body, is_answered, is_secret, created_at, answered_at
                    ) VALUES (
                        :product_id, :user_id, :question_title, :question_body,
                        :answer_body, :is_answered, :is_secret, :created_at, :answered_at
                    )
                """),
                {
                    "product_id": prod_id,
                    "user_id": user_id,
                    "question_title": q_title,
                    "question_body": q_body,
                    "answer_body": answer,
                    "is_answered": is_answered,
                    "is_secret": is_secret,
                    "created_at": created,
                    "answered_at": answered_at,
                },
            )
            count += 1

        if count % 1000 == 0:
            await session.commit()
            print(f"  ... {count} Q&As created")

    await session.commit()
    print(f"Q&A seeded: {count} items.")


async def seed_review_helpful(session: AsyncSession):
    """Seed helpful votes on reviews to match existing likes counts."""
    print("Seeding review helpful votes...")

    result = await session.execute(
        text("SELECT id, likes FROM reviews WHERE likes > 0 ORDER BY likes DESC LIMIT 5000")
    )
    reviews_with_likes = result.all()

    result2 = await session.execute(text("SELECT id FROM users"))
    user_ids = [r[0] for r in result2.all()]

    count = 0
    for review_id, likes in reviews_with_likes:
        voters = random.sample(user_ids, k=min(likes, len(user_ids)))
        for uid in voters:
            await session.execute(
                text("""
                    INSERT INTO review_helpful (review_id, user_id)
                    VALUES (:review_id, :user_id)
                    ON CONFLICT DO NOTHING
                """),
                {"review_id": review_id, "user_id": uid},
            )
            count += 1

        if count % 2000 == 0 and count > 0:
            await session.commit()
            print(f"  ... {count} helpful votes created")

    await session.commit()
    print(f"Review helpful votes seeded: {count} items.")


async def main():
    print("=" * 60)
    print("YES24 Clone - Data Seeder")
    print("=" * 60)

    # Load categories
    categories_path = Path(__file__).parent / "categories.json"
    with open(categories_path) as f:
        categories_data = json.load(f)

    leaf_categories = [c["code"] for c in categories_data if c["depth"] == 3]
    # Add depth-2 categories that have no children
    parent_codes = {c["parent_code"] for c in categories_data if c["parent_code"]}
    for c in categories_data:
        if c["depth"] == 2 and c["code"] not in parent_codes:
            leaf_categories.append(c["code"])

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_sess = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    minio_client = Minio(
        MINIO_ENDPOINT, access_key=MINIO_ACCESS_KEY, secret_key=MINIO_SECRET_KEY, secure=False
    )

    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)

    async with async_sess() as session:
        # Check if already seeded
        result = await session.execute(text("SELECT COUNT(*) FROM products"))
        count = result.scalar()
        if count and count > 1000:
            print(f"Database already has {count} products. Skipping seed.")
            print("To re-seed, run: make reset")
            return

        await seed_categories(session, categories_data)
        await seed_users(session)
        await seed_products(session, leaf_categories, minio_client)
        await seed_reviews(session)
        await seed_banners(session)
        await seed_events(session)
        await seed_orders(session)
        await seed_autocomplete(redis_client, session)
        await seed_addresses(session)
        await seed_static_pages(session)
        await seed_faq(session)
        await seed_coupons(session)
        await seed_more_orders(session)
        await seed_qna(session)
        await seed_review_helpful(session)

    await engine.dispose()
    await redis_client.aclose()

    print("=" * 60)
    print("Seeding complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
