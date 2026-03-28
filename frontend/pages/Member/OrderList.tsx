import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';

interface Order {
  id: number;
  order_no: string;
  total_amount: number;
  status: string;
  created_at: string;
  items_count?: number;
}

interface Props {
  orders: Order[];
}

const STATUS_MAP: Record<string, string> = {
  pending: '주문확인중',
  confirmed: '주문확인',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '주문취소',
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const cookie = ctx.req.headers.cookie || '';

  try {
    const data = await apiFetch<{ items: Order[] } | Order[]>('/orders', {
      isServer: true,
      headers: { cookie },
    });
    const orders = Array.isArray(data) ? data : (data as any).items || [];
    return { props: { orders } };
  } catch {
    return { redirect: { destination: '/Templates/FTLogin', permanent: false } };
  }
};

export default function OrderListPage({ orders }: Props) {
  return (
    <>
      <Head><title>주문목록 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <Link href="/Member/FTMypageMain">마이페이지</Link>
          <span className="ico_arr">&gt;</span>
          <span>주문목록</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          주문목록
        </h2>

        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
            <svg width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p style={{ fontSize: 14 }}>주문 내역이 없습니다.</p>
            <Link href="/" className="btnC btn_blue" style={{
              display: 'inline-block', marginTop: 20, padding: '10px 24px',
              fontSize: 13, color: '#fff', background: '#0080ff', border: 'none',
              borderRadius: 2, textDecoration: 'none',
            }}>
              쇼핑 계속하기
            </Link>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 40 }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ padding: '10px 12px', borderTop: '1px solid #333', borderBottom: '1px solid #ebebeb', textAlign: 'left', fontWeight: 600 }}>주문번호</th>
                <th style={{ padding: '10px 12px', borderTop: '1px solid #333', borderBottom: '1px solid #ebebeb', textAlign: 'left', fontWeight: 600 }}>주문일</th>
                <th style={{ padding: '10px 12px', borderTop: '1px solid #333', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600 }}>결제금액</th>
                <th style={{ padding: '10px 12px', borderTop: '1px solid #333', borderBottom: '1px solid #ebebeb', textAlign: 'center', fontWeight: 600 }}>상태</th>
                <th style={{ padding: '10px 12px', borderTop: '1px solid #333', borderBottom: '1px solid #ebebeb', textAlign: 'center', fontWeight: 600 }}>상세</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ebebeb', fontWeight: 500 }}>
                    {order.order_no}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ebebeb', color: '#999' }}>
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : '-'}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600 }}>
                    {order.total_amount.toLocaleString()}원
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ebebeb', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 2, fontSize: 11,
                      background: order.status === 'delivered' ? '#e8f4ff' : order.status === 'cancelled' ? '#fff0f0' : '#f8f8f8',
                      color: order.status === 'delivered' ? '#0080ff' : order.status === 'cancelled' ? '#ff6666' : '#666',
                    }}>
                      {STATUS_MAP[order.status] || order.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #ebebeb', textAlign: 'center' }}>
                    <Link
                      href={`/Member/OrderDetail/${order.order_no}`}
                      style={{
                        padding: '4px 12px', fontSize: 11, border: '1px solid #ccc',
                        borderRadius: 2, textDecoration: 'none', color: '#333',
                        background: '#fff',
                      }}
                    >
                      상세보기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
