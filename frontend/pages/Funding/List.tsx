import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { EventItem } from '@/lib/types';
import { getImageUrl } from '@/lib/constants';

interface Props {
  campaigns: EventItem[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const campaigns = await apiFetch<EventItem[]>('/events', { isServer: true });
    return { props: { campaigns: Array.isArray(campaigns) ? campaigns : [] } };
  } catch {
    return { props: { campaigns: [] } };
  }
};

function getDday(index: number): number {
  // Simulate D-day countdown based on item position
  return Math.max(1, 30 - index * 3);
}

function getProgress(index: number): number {
  // Simulate funding progress
  return Math.min(100, 40 + index * 12);
}

export default function FundingListPage({ campaigns }: Props) {
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
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          펀딩
        </h2>

        {campaigns.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            진행 중인 펀딩이 없습니다.
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
          marginBottom: 40,
        }}>
          {campaigns.map((item, idx) => {
            const dday = getDday(idx);
            const progress = getProgress(idx);
            return (
              <Link
                key={item.id}
                href={`/event/${item.event_no}`}
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
                  {/* Banner */}
                  <div style={{
                    height: 160,
                    background: item.banner_image ? `url(${getImageUrl(item.banner_image)}) center/cover` : 'linear-gradient(135deg, #0080ff, #00bfff)',
                    position: 'relative',
                  }}>
                    {/* D-day badge */}
                    <span style={{
                      position: 'absolute', top: 10, right: 10,
                      background: dday <= 7 ? '#ff6666' : '#0080ff',
                      color: '#fff', fontSize: 12, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 2,
                    }}>
                      D-{dday}
                    </span>
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <h3 style={{
                      fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 10,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </h3>

                    {/* Progress bar */}
                    <div style={{
                      height: 6, background: '#eee', borderRadius: 3,
                      overflow: 'hidden', marginBottom: 6,
                    }}>
                      <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: progress >= 100 ? '#ff6666' : '#0080ff',
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#0080ff', fontWeight: 700 }}>{progress}% 달성</span>
                      <span style={{ color: '#999' }}>D-{dday}</span>
                    </div>

                    {item.description && (
                      <p style={{
                        fontSize: 11, color: '#999', marginTop: 8,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
