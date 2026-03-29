import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { EventItem, Product } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';

interface Props {
  event: EventItem | null;
  products: Product[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const eventno = ctx.params?.eventno as string;
  try {
    const event = await apiFetch<EventItem>(`/events/${eventno}`, { isServer: true });
    // Get some recommended products as "event products"
    const products = await apiFetch<Product[]>('/products/recommended?limit=12', { isServer: true }).catch(() => []);
    return { props: { event, products: Array.isArray(products) ? products : [] } };
  } catch {
    return { props: { event: null, products: [] } };
  }
};

export default function EventDetailPage({ event, products }: Props) {
  if (!event) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '80px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>이벤트를 찾을 수 없습니다</h2>
        <p style={{ color: '#999', marginBottom: 20 }}>요청하신 이벤트가 존재하지 않거나 종료되었습니다.</p>
        <Link href="/event/List" className="btnC btn_blue b_size">이벤트 목록</Link>
      </div>
    );
  }

  const BANNER_BG = 'linear-gradient(135deg, #003466 0%, #1a5276 50%, #0f3460 100%)';

  return (
    <>
      <Head><title>{event.title} - 이벤트 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link>
          <span className="ico_arr">&gt;</span>
          <Link href="/event/List">이벤트</Link>
          <span className="ico_arr">&gt;</span>
          <span style={{ color: '#333' }}>{event.title.slice(0, 30)}</span>
        </div>
      </div>

      {/* Full width banner */}
      <div style={{ position: 'relative', height: 320, overflow: 'hidden', marginBottom: 30 }}>
        <img
          src={`https://picsum.photos/seed/eventdetail${event.id}/1200/320`}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: 3, marginBottom: 12 }}>YES24 EVENT</div>
            <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>{event.title}</h1>
            {event.start_date && event.end_date && (
              <p style={{ fontSize: 14, opacity: 0.85 }}>
                {new Date(event.start_date).toLocaleDateString('ko-KR')} ~ {new Date(event.end_date).toLocaleDateString('ko-KR')}
              </p>
            )}
            <span style={{
              display: 'inline-block', marginTop: 12, padding: '5px 14px',
              background: event.is_active ? 'rgba(0,200,83,0.85)' : 'rgba(100,100,100,0.85)',
              color: '#fff', borderRadius: 3, fontSize: 12, fontWeight: 600,
            }}>
              {event.is_active ? '진행중' : '종료'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
        {/* Event description */}
        {event.description && (
          <div style={{ marginBottom: 30, padding: 20, background: '#f8f8f8', borderRadius: 4, fontSize: 14, lineHeight: 1.8, color: '#555' }}>
            {event.description}
          </div>
        )}

        {/* Event content HTML */}
        {event.content_html && (
          <div className="event-content" style={{ marginBottom: 30 }} dangerouslySetInnerHTML={{ __html: event.content_html }} />
        )}

        {/* Event products */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 20 }}>
            이벤트 상품
          </h2>
          {products.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {products.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
              이벤트 상품이 없습니다.
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/event/List" className="btnC b_size">이벤트 목록으로 돌아가기</Link>
        </div>
      </div>
    </>
  );
}
