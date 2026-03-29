#!/usr/bin/env python3
import asyncio
import random
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text

DATABASE_URL = "postgresql+asyncpg://yes24:yes24@postgres:5432/yes24"

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
        for i, (pid, title, author) in enumerate(products):
            desc = gen_desc(title, author)
            toc = gen_toc()
            await session.execute(
                text("UPDATE products SET description = :desc, toc = :toc WHERE id = :id"),
                {"id": pid, "desc": desc, "toc": toc}
            )
            if (i + 1) % 500 == 0:
                await session.commit()
                print(f"  Updated {i+1}/{len(products)}")
        await session.commit()
        print("Done!")

asyncio.run(main())
