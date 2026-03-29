import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import MypageLayout from '@/components/layout/MypageLayout';

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

function getStatusColor(status: string): { bg: string; color: string } {
  switch (status) {
    case 'confirmed':
    case 'pending':
      return { bg: '#e0f0ff', color: '#0080ff' };
    case 'shipping':
      return { bg: '#e8f5e9', color: '#43a047' };
    case 'delivered':
      return { bg: '#f5f5f5', color: '#999' };
    case 'cancelled':
      return { bg: '#fff0f0', color: '#ff6666' };
    default:
      return { bg: '#f8f8f8', color: '#666' };
  }
}

export default function OrderListPage({ orders }: Props) {
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleCancel = async (orderNo: string) => {
    if (!confirm('주문을 취소하시겠습니까?')) return;
    try {
      await apiFetch(`/orders/${orderNo}/cancel`, { method: 'POST' });
      router.replace(router.asPath);
    } catch {
      alert('주문 취소에 실패했습니다.');
    }
  };

  return (
    <MypageLayout title="주문내역">
      <Head><title>주문목록 - YES24</title></Head>

        {/* Date Range Filter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          padding: '12px 16px', background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 4,
        }}>
          <span style={{ fontSize: 13, color: '#333', fontWeight: 600 }}>조회기간</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '4px 8px', border: '1px solid #ccc', borderRadius: 2,
              fontSize: 12, color: '#333',
            }}
          />
          <span style={{ color: '#999' }}>~</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '4px 8px', border: '1px solid #ccc', borderRadius: 2,
              fontSize: 12, color: '#333',
            }}
          />
          <button style={{
            padding: '5px 16px', fontSize: 12, background: '#0080ff', color: '#fff',
            border: 'none', borderRadius: 2, cursor: 'pointer',
          }}>
            조회
          </button>
        </div>

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
                <th style={{ padding: '10px 12px', borderTop: '1px solid #333', borderBottom: '1px solid #ebebeb', textAlign: 'center', fontWeight: 600 }}>취소</th>
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
                      background: getStatusColor(order.status).bg,
                      color: getStatusColor(order.status).color,
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
                  <td style={{ padding: '12px', borderBottom: '1px solid #ebebeb', textAlign: 'center' }}>
                    {order.status !== 'cancelled' && order.status !== 'delivered' ? (
                      <button
                        onClick={() => handleCancel(order.order_no)}
                        style={{
                          padding: '4px 12px', fontSize: 11, border: '1px solid #ff6666',
                          borderRadius: 2, color: '#ff6666', background: '#fff',
                          cursor: 'pointer',
                        }}
                      >
                        주문취소
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#ccc' }}>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </MypageLayout>
  );
}
