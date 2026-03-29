import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Product } from '@/lib/types';
import { getImageUrl } from '@/lib/constants';
import { getCoverUrl } from '@/lib/api';

const MD_COMMENTS = [
  '올해 가장 주목할 만한 작품입니다. 깊이 있는 서사와 세련된 문체가 돋보입니다.',
  '독자들의 압도적인 지지를 받는 베스트셀러. 한 번 읽기 시작하면 멈출 수 없습니다.',
  '새로운 시각으로 세상을 바라보게 하는 책. 꼭 읽어보시길 추천합니다.',
  '감동적인 이야기와 아름다운 문장이 가득한 책입니다.',
  '지식의 폭을 넓혀주는 교양서. 누구나 쉽게 읽을 수 있습니다.',
  '작가의 깊은 통찰이 담긴 수작. 오래 기억에 남을 책입니다.',
  '재미와 감동을 동시에 선사하는 작품. 선물용으로도 좋습니다.',
  '올해의 발견! 아직 모르셨다면 지금 바로 만나보세요.',
];

function Stars({ rating }: { rating: number }) {
  const full = Math.round(Number(rating));
  return <span style={{ color: '#ffb800', fontSize: 12, letterSpacing: -1 }}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

interface Props { products: Product[]; }

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const products = await apiFetch<Product[]>('/products/recommended?limit=24', { isServer: true });
    return { props: { products: Array.isArray(products) ? products : [] } };
  } catch { return { props: { products: [] } }; }
};

export default function RecommendedPage({ products }: Props) {
  return (
    <>
      <Head><title>MD 추천 - YES24</title></Head>
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link><span className="ico_arr">&gt;</span><span>MD 추천</span>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 20 }}>
          MD 추천
        </h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24, lineHeight: 1.7 }}>
          YES24의 MD가 직접 선정한 추천 도서입니다. 분야별 전문 MD들이 엄선한 책을 만나보세요.
        </p>

        {products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>추천 도서가 없습니다.</div>
        ) : (
          <div style={{ marginBottom: 40 }}>
            {products.map((p, i) => (
              <div key={p.id} style={{
                display: 'flex', gap: 20, padding: '24px 0',
                borderBottom: '1px solid #ebebeb',
              }}>
                <Link href={`/Product/Goods/${p.goods_no}`} style={{ flexShrink: 0 }}>
                  <img src={getCoverUrl(p.cover_image, p.goods_no)} alt={p.title} style={{ width: 120, border: '1px solid #ebebeb', display: 'block' }} loading="lazy" />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'inline-block', padding: '2px 8px', background: '#0080ff',
                    color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 2, marginBottom: 8,
                  }}>
                    MD PICK
                  </div>
                  <Link href={`/Product/Goods/${p.goods_no}`} style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 6, lineHeight: 1.4 }}>
                    {p.title}
                  </Link>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                    {p.author} | {p.publisher}
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    {p.discount_rate > 0 && <span style={{ color: '#ff6666', fontWeight: 700, marginRight: 4 }}>{p.discount_rate}%</span>}
                    <strong style={{ fontSize: 16 }}>{p.sale_price.toLocaleString()}</strong><span>원</span>
                  </div>
                  {p.review_count > 0 && (
                    <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
                      <Stars rating={Number(p.rating_avg)} /> {Number(p.rating_avg).toFixed(1)} ({p.review_count}건)
                    </div>
                  )}
                  {/* MD Comment */}
                  <div style={{
                    padding: '12px 16px', background: '#f8f8f8', borderRadius: 4,
                    borderLeft: '3px solid #0080ff', fontSize: 13, color: '#555', lineHeight: 1.7, fontStyle: 'italic',
                  }}>
                    &ldquo;{MD_COMMENTS[i % MD_COMMENTS.length]}&rdquo;
                    <div style={{ marginTop: 6, fontSize: 11, color: '#999', fontStyle: 'normal' }}>
                      &mdash; YES24 {['문학', '인문', '경제경영', '자기계발', 'IT', '어린이', '에세이', '사회과학'][i % 8]} MD
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
