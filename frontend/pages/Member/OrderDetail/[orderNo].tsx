import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { getImageUrl } from '@/lib/constants';

interface OrderItem {
  id: number;
  product_id: number;
  goods_no?: number;
  title: string;
  cover_image?: string;
  quantity: number;
  price: number;
}

interface OrderDetail {
  id: number;
  order_no: string;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
  shipping_name?: string;
  shipping_phone?: string;
  shipping_address?: string;
  shipping_memo?: string;
}

interface Props {
  order: OrderDetail | null;
}

const STATUS_MAP: Record<string, string> = {
  pending: '주문확인중',
  confirmed: '주문확인',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '주문취소',
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const orderNo = ctx.params?.orderNo as string;
  const cookie = ctx.req.headers.cookie || '';

  try {
    const order = await apiFetch<OrderDetail>(`/orders/${orderNo}`, {
      isServer: true,
      headers: { cookie },
    });
    return { props: { order } };
  } catch {
    return { props: { order: null } };
  }
};

export default function OrderDetailPage({ order }: Props) {
  if (!order) {
    return (
      <>
        <Head><title>주문 상세 - YES24</title></Head>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: 80, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 20 }}>주문 정보를 찾을 수 없습니다.</p>
          <Link href="/Member/OrderList" className="btnC btn_blue" style={{
            display: 'inline-block', padding: '10px 24px', fontSize: 13,
            color: '#fff', background: '#0080ff', borderRadius: 2, textDecoration: 'none',
          }}>
            주문목록으로 이동
          </Link>
        </div>
      </>
    );
  }

  const itemsTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <Head><title>주문 상세 ({order.order_no}) - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <Link href="/Member/FTMypageMain">마이페이지</Link>
          <span className="ico_arr">&gt;</span>
          <Link href="/Member/OrderList">주문목록</Link>
          <span className="ico_arr">&gt;</span>
          <span>주문 상세</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          주문 상세
        </h2>

        {/* Order info header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 4,
          padding: '16px 20px', marginBottom: 24,
        }}>
          <div>
            <span style={{ fontSize: 12, color: '#999' }}>주문번호</span>
            <strong style={{ fontSize: 14, color: '#333', marginLeft: 8 }}>{order.order_no}</strong>
          </div>
          <div>
            <span style={{ fontSize: 12, color: '#999' }}>주문일</span>
            <span style={{ fontSize: 13, color: '#333', marginLeft: 8 }}>
              {order.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : '-'}
            </span>
          </div>
          <div>
            <span style={{
              padding: '4px 12px', borderRadius: 2, fontSize: 12, fontWeight: 600,
              background: order.status === 'delivered' ? '#e8f4ff' : order.status === 'cancelled' ? '#fff0f0' : '#f8f8f8',
              color: order.status === 'delivered' ? '#0080ff' : order.status === 'cancelled' ? '#ff6666' : '#333',
              border: '1px solid #ebebeb',
            }}>
              {STATUS_MAP[order.status] || order.status}
            </span>
          </div>
        </div>

        {/* Order Items */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #333' }}>
            주문 상품
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'left', fontWeight: 600 }}>상품</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'center', fontWeight: 600, width: 80 }}>수량</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600, width: 120 }}>금액</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: '12px 10px', borderBottom: '1px solid #ebebeb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={getImageUrl(item.cover_image || null)}
                        alt={item.title}
                        style={{ width: 50, height: 70, objectFit: 'cover', border: '1px solid #ebebeb' }}
                        loading="lazy"
                      />
                      <div>
                        <Link
                          href={`/Product/Goods/${item.goods_no || item.product_id}`}
                          style={{ fontSize: 13, color: '#333', textDecoration: 'none', fontWeight: 500 }}
                        >
                          {item.title}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'center' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '12px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600 }}>
                    {(item.price * item.quantity).toLocaleString()}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Shipping Address */}
        {(order.shipping_name || order.shipping_address) && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #333' }}>
              배송 정보
            </h3>
            <div style={{ background: '#f8f8f8', padding: '16px 20px', borderRadius: 4, fontSize: 13, lineHeight: 1.8 }}>
              {order.shipping_name && <div><span style={{ color: '#999', width: 80, display: 'inline-block' }}>받는분</span> {order.shipping_name}</div>}
              {order.shipping_phone && <div><span style={{ color: '#999', width: 80, display: 'inline-block' }}>연락처</span> {order.shipping_phone}</div>}
              {order.shipping_address && <div><span style={{ color: '#999', width: 80, display: 'inline-block' }}>주소</span> {order.shipping_address}</div>}
              {order.shipping_memo && <div><span style={{ color: '#999', width: 80, display: 'inline-block' }}>배송메모</span> {order.shipping_memo}</div>}
            </div>
          </div>
        )}

        {/* Total */}
        <div style={{
          border: '2px solid #333', borderRadius: 4, padding: '20px 24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 40,
        }}>
          <div style={{ fontSize: 13, color: '#666' }}>
            상품금액 <strong style={{ color: '#333' }}>{itemsTotal.toLocaleString()}원</strong>
            <span style={{ margin: '0 8px', color: '#ddd' }}>+</span>
            배송비 <strong style={{ color: '#333' }}>0원</strong>
          </div>
          <div>
            <span style={{ fontSize: 13, color: '#666', marginRight: 8 }}>총 결제금액</span>
            <strong style={{ fontSize: 20, color: '#ff6666' }}>{order.total_amount.toLocaleString()}</strong>
            <span style={{ fontSize: 14, color: '#ff6666' }}>원</span>
          </div>
        </div>

        {/* Back button */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Link href="/Member/OrderList" style={{
            display: 'inline-block', padding: '10px 30px', fontSize: 13,
            border: '1px solid #ccc', borderRadius: 2, textDecoration: 'none', color: '#333',
            marginRight: 8,
          }}>
            주문목록
          </Link>
          <Link href="/" style={{
            display: 'inline-block', padding: '10px 30px', fontSize: 13,
            background: '#0080ff', color: '#fff', borderRadius: 2, textDecoration: 'none',
          }}>
            쇼핑 계속하기
          </Link>
        </div>
      </div>
    </>
  );
}
