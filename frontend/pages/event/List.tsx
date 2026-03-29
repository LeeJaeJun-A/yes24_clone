import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { EventItem } from '@/lib/types';

interface Props {
  activeEvents: EventItem[];
  endedEvents: EventItem[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const [active, ended] = await Promise.all([
      apiFetch<EventItem[]>('/events?status=active', { isServer: true }).catch(() => []),
      apiFetch<EventItem[]>('/events?status=ended', { isServer: true }).catch(() => []),
    ]);
    return { props: { activeEvents: Array.isArray(active) ? active : [], endedEvents: Array.isArray(ended) ? ended : [] } };
  } catch {
    return { props: { activeEvents: [], endedEvents: [] } };
  }
};

function getBadge(evt: EventItem): { text: string; bg: string; color: string } {
  if (!evt.is_active) return { text: '종료', bg: '#f5f5f5', color: '#999' };
  if (evt.end_date) {
    const daysLeft = Math.ceil((new Date(evt.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3 && daysLeft > 0) return { text: '마감임박', bg: '#fff3e0', color: '#e65100' };
  }
  if (evt.start_date) {
    const daysSinceStart = Math.ceil((Date.now() - new Date(evt.start_date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceStart <= 7) return { text: 'NEW', bg: '#e8f5e9', color: '#2e7d32' };
  }
  return { text: 'HOT', bg: '#fce4ec', color: '#c62828' };
}

export default function EventListPage({ activeEvents, endedEvents }: Props) {
  const [tab, setTab] = useState<'active' | 'ended'>('active');
  const events = tab === 'active' ? activeEvents : endedEvents;

  // If no events loaded, create placeholder events
  const displayEvents = events.length > 0 ? events : Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    event_no: 1000 + i,
    title: [
      '2026 상반기 베스트셀러 기획전', '봄맞이 도서 특가전', '신간 알리미 이벤트',
      '북클럽 회원 특별 혜택', '어린이날 도서 선물 기획전', '에세이 특집 이벤트',
      '여름 독서 마라톤', 'MD가 추천하는 올해의 책',
    ][i],
    description: '자세한 내용은 이벤트 페이지에서 확인하세요.',
    banner_image: null,
    start_date: '2026-03-01T00:00:00',
    end_date: i < 6 ? '2026-06-30T00:00:00' : '2026-03-15T00:00:00',
    is_active: tab === 'active',
  }));

  const BANNER_COLORS = [
    'linear-gradient(135deg, #003466, #1a5276)',
    'linear-gradient(135deg, #1a3a5c, #2c3e50)',
    'linear-gradient(135deg, #2c1654, #4a1a8a)',
    'linear-gradient(135deg, #0f3460, #16537e)',
    'linear-gradient(135deg, #1e3a5f, #2d5f8a)',
    'linear-gradient(135deg, #1b4332, #2d6a4f)',
    'linear-gradient(135deg, #4a1942, #6b2fa0)',
    'linear-gradient(135deg, #3c1642, #7f5af0)',
  ];

  return (
    <>
      <Head><title>이벤트 - YES24</title></Head>
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link>
          <span className="ico_arr">&gt;</span>
          <span>이벤트</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 0 }}>
          이벤트
        </h2>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ebebeb', marginBottom: 24 }}>
          {[
            { key: 'active' as const, label: '진행중 이벤트' },
            { key: 'ended' as const, label: '종료된 이벤트' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '12px 24px', fontSize: 14, border: 'none', cursor: 'pointer',
                background: tab === t.key ? '#333' : 'transparent',
                color: tab === t.key ? '#fff' : '#666',
                fontWeight: tab === t.key ? 700 : 400,
                borderRadius: tab === t.key ? '3px 3px 0 0' : 0,
              }}
            >
              {t.label}
              <span style={{ fontSize: 12, marginLeft: 4, opacity: 0.7 }}>
                ({t.key === 'active' ? activeEvents.length || 8 : endedEvents.length || 0})
              </span>
            </button>
          ))}
        </div>

        {displayEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            {tab === 'active' ? '진행 중인 이벤트가 없습니다.' : '종료된 이벤트가 없습니다.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 40 }}>
            {displayEvents.map((evt, i) => {
              const badge = getBadge(evt as EventItem);
              return (
                <Link key={evt.id} href={`/event/${evt.event_no}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{
                    border: '1px solid #ebebeb', borderRadius: 6, overflow: 'hidden',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                      (e.currentTarget as HTMLDivElement).style.transform = '';
                    }}
                  >
                    <div style={{
                      height: 200,
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      {/* Background image */}
                      <img
                        src={`https://picsum.photos/seed/event${evt.id || i + 1}/560/200`}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      {/* Dark overlay + text */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
                        display: 'flex', alignItems: 'flex-end', padding: '16px 18px',
                      }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 2, marginBottom: 4 }}>YES24 EVENT</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{evt.title}</div>
                        </div>
                      </div>
                      <span style={{
                        position: 'absolute', top: 12, right: 12,
                        padding: '3px 8px', borderRadius: 2, fontSize: 11, fontWeight: 700,
                        background: badge.bg, color: badge.color,
                      }}>
                        {badge.text}
                      </span>
                    </div>
                    <div style={{ padding: '14px 16px' }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {evt.title}
                      </h3>
                      {evt.start_date && evt.end_date && (
                        <p style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                          {new Date(evt.start_date).toLocaleDateString('ko-KR')} ~ {new Date(evt.end_date).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                      {evt.description && (
                        <p style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {evt.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
