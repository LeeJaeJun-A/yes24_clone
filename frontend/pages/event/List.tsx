import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { EventItem } from '@/lib/types';
import { getImageUrl } from '@/lib/constants';

interface Props {
  events: EventItem[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const events = await apiFetch<EventItem[]>('/events', { isServer: true });
    return { props: { events: Array.isArray(events) ? events : [] } };
  } catch {
    return { props: { events: [] } };
  }
};

export default function EventListPage({ events }: Props) {
  return (
    <>
      <Head><title>이벤트 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>이벤트</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          이벤트
        </h2>

        {events.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            진행 중인 이벤트가 없습니다.
          </div>
        )}

        {/* 2-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
          marginBottom: 40,
        }}>
          {events.map(evt => (
            <Link
              key={evt.id}
              href={`/event/${evt.event_no}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div style={{
                border: '1px solid #ebebeb',
                borderRadius: 4,
                overflow: 'hidden',
                transition: 'box-shadow 0.2s',
              }}
                onMouseOver={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }}
                onMouseOut={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                {/* Banner color block */}
                <div style={{
                  height: 140,
                  background: evt.banner_image ? `url(${getImageUrl(evt.banner_image)}) center/cover` : `linear-gradient(135deg, #0080ff, #4da6ff)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {!evt.banner_image && (
                    <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>EVENT</span>
                  )}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <h3 style={{
                    fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {evt.title}
                  </h3>
                  {evt.description && (
                    <p style={{
                      fontSize: 12, color: '#999', marginBottom: 8,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {evt.description}
                    </p>
                  )}
                  <div style={{ fontSize: 11, color: '#999' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      background: evt.is_active ? '#e8f4ff' : '#f5f5f5',
                      color: evt.is_active ? '#0080ff' : '#999',
                      borderRadius: 2,
                      fontSize: 11,
                    }}>
                      {evt.is_active ? '진행중' : '종료'}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
