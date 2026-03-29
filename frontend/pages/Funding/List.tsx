import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { apiFetch, getCoverUrl } from '@/lib/api';

interface FundingProduct {
  goods_no: number;
  title: string;
  author: string;
  publisher: string;
  cover_image: string | null;
  sale_price: number;
}

interface FundingItem {
  id: number;
  title: string;
  description: string;
  goal_amount: number;
  current_amount: number;
  backer_count: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  days_remaining: number;
  progress: number;
  product: FundingProduct | null;
}

interface FundingResponse {
  items: FundingItem[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

interface Props {
  activeFundings: FundingResponse;
  endedFundings: FundingResponse;
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const empty: FundingResponse = { items: [], total: 0, page: 1, size: 20, pages: 0 };
  const [activeFundings, endedFundings] = await Promise.all([
    apiFetch<FundingResponse>('/fundings?active=true&size=20', { isServer: true }).catch(() => empty),
    apiFetch<FundingResponse>('/fundings?active=false&size=20', { isServer: true }).catch(() => empty),
  ]);
  return { props: { activeFundings, endedFundings } };
};

export default function FundingListPage({ activeFundings, endedFundings }: Props) {
  const [tab, setTab] = useState<'active' | 'ended'>('active');
  const fundings = tab === 'active' ? activeFundings : endedFundings;

  return (
    <>
      <Head><title>펀딩 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>펀딩</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 0 }}>
          펀딩
        </h2>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid #d8d8d8' }}>
          {[
            { key: 'active' as const, label: '진행중' },
            { key: 'ended' as const, label: '종료' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 24px', fontSize: 13, border: 'none', cursor: 'pointer',
                background: tab === t.key ? '#333' : 'transparent',
                color: tab === t.key ? '#fff' : '#666',
                fontWeight: tab === t.key ? 700 : 400,
                borderRadius: '3px 3px 0 0',
              }}
            >
              {t.label}
              <span style={{ fontSize: 11, marginLeft: 4 }}>
                ({t.key === 'active' ? activeFundings.total : endedFundings.total})
              </span>
            </button>
          ))}
        </div>

        {fundings.items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            {tab === 'active' ? '진행 중인 펀딩이 없습니다.' : '종료된 펀딩이 없습니다.'}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {fundings.items.map(item => (
            <div
              key={item.id}
              style={{
                border: '1px solid #ebebeb', borderRadius: 4, overflow: 'hidden',
                transition: 'box-shadow 0.2s',
              }}
              onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
              onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
            >
              {/* Cover image */}
              <div style={{ height: 200, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {item.product ? (
                  <Link href={`/Product/Goods/${item.product.goods_no}`}>
                    <img
                      src={getCoverUrl(item.product.cover_image, item.product.goods_no)}
                      alt={item.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </Link>
                ) : (
                  <div style={{ background: 'linear-gradient(135deg, #0080ff, #00bfff)', width: '100%', height: '100%' }} />
                )}
                {/* D-day badge */}
                <span style={{
                  position: 'absolute', top: 10, right: 10,
                  background: item.days_remaining <= 7 ? '#ff6666' : '#0080ff',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 2,
                }}>
                  {tab === 'active' ? `D-${item.days_remaining}` : '종료'}
                </span>
              </div>

              <div style={{ padding: '14px 16px' }}>
                <h3 style={{
                  fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {item.title}
                </h3>

                {item.product && (
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                    {item.product.author} · {item.product.publisher}
                  </div>
                )}

                {/* Progress bar */}
                <div style={{ height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                  <div style={{
                    width: `${Math.min(100, item.progress)}%`,
                    height: '100%',
                    background: item.progress >= 100 ? '#ff6666' : '#0080ff',
                    borderRadius: 3,
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ color: item.progress >= 100 ? '#ff6666' : '#0080ff', fontWeight: 700 }}>
                    {item.progress}% 달성
                  </span>
                  <span style={{ color: '#999' }}>{item.current_amount.toLocaleString()}원</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999' }}>
                  <span>{item.backer_count}명 참��</span>
                  <span>{tab === 'active' ? `${item.days_remaining}일 남음` : '��딩 종료'}</span>
                </div>

                {item.description && (
                  <p style={{
                    fontSize: 11, color: '#999', marginTop: 8,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {item.description}
                  </p>
                )}

                {tab === 'active' && (
                  <button
                    onClick={() => alert('펀딩 참여가 완료되었습니다! (데모)')}
                    className="btnC btn_blue m_size"
                    style={{ width: '100%', marginTop: 12, fontSize: 12 }}
                  >
                    <span className="bWrap"><em className="txt">펀딩하기</em></span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
