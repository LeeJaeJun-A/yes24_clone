#!/usr/bin/env python3
import asyncio
import random
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://yes24:yes24@postgres:5432/yes24"

FUNDING_TITLES = [
    "한국 현대 시인 선집 특별 한정판",
    "독립출판 에세이 모음집 프로젝트",
    "어린이를 위한 한국 역사 그림책",
    "SF 단편 소설 앤솔로지 출간",
    "사라져가는 방언 기록 프로젝트",
    "청소년 진로 탐색 가이드북",
    "한국 전통 음식 레시피북 특별판",
    "세계 여행 에세이 일러스트 에디션",
    "프로그래밍 입문자를 위한 실습서",
    "한국 근현대 건축 사진집",
    "고전 문학 현대어 번역 시리즈",
    "환경과 생태 교양 과학서",
    "독서 모임 운영 가이드",
    "한국 인디 음악 아카이브",
    "디자인 씽킹 워크북 개정판",
]

DESCRIPTIONS = [
    "독자 여러분의 참여로 만들어지는 특별한 도서 프로젝트입니다.",
    "출판의 새로운 가능성을 열어가는 크라우드펀딩 프로젝트에 함께해 주세요.",
    "기존에 없던 새로운 기획으로 독서 문화에 기여하고자 합니다.",
    "저자와 독자가 함께 만들어가는 의미 있는 출판 프로젝트입니다.",
    "한정판 특별 구성으로 소장 가치가 높은 도서를 제작합니다.",
]

async def main():
    engine = create_async_engine(DATABASE_URL)
    async with AsyncSession(engine) as session:
        # Create table
        await session.execute(text("""
            CREATE TABLE IF NOT EXISTS fundings (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id),
                title VARCHAR(500),
                description TEXT,
                goal_amount INTEGER,
                current_amount INTEGER DEFAULT 0,
                backer_count INTEGER DEFAULT 0,
                start_date DATE,
                end_date DATE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        await session.commit()

        # Check if already seeded
        count = (await session.execute(text("SELECT COUNT(*) FROM fundings"))).scalar()
        if count > 0:
            print(f"Fundings table already has {count} rows, skipping seed.")
            return

        # Get some product IDs to associate
        result = await session.execute(text("SELECT id FROM products ORDER BY random() LIMIT 15"))
        product_ids = [r[0] for r in result.fetchall()]

        today = date.today()
        for i, title in enumerate(FUNDING_TITLES):
            pid = product_ids[i] if i < len(product_ids) else product_ids[0]
            goal = random.choice([500000, 1000000, 2000000, 3000000, 5000000])
            progress_pct = random.uniform(0.3, 2.5)
            current = int(goal * progress_pct)
            backers = int(current / random.randint(15000, 50000)) + random.randint(5, 100)
            start = today - timedelta(days=random.randint(10, 60))
            end = today + timedelta(days=random.randint(5, 45))
            desc = random.choice(DESCRIPTIONS)

            await session.execute(text("""
                INSERT INTO fundings (product_id, title, description, goal_amount, current_amount, backer_count, start_date, end_date, is_active)
                VALUES (:pid, :title, :desc, :goal, :current, :backers, :start, :end, TRUE)
            """), {
                "pid": pid, "title": title, "desc": desc,
                "goal": goal, "current": current, "backers": backers,
                "start": start, "end": end,
            })
        await session.commit()
        print(f"Seeded {len(FUNDING_TITLES)} fundings")

asyncio.run(main())
