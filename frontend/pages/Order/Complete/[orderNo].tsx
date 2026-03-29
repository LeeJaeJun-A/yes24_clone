import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

interface OrderItem {
  title: string;
  quantity: number;
  price: number;
}

interface Props {
  orderNo: string;
  totalAmount: number;
  pointEarned: number;
  items: OrderItem[];
  status: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const orderNo = ctx.params?.orderNo as string;
  try {
    const cookie = ctx.req.headers.cookie || '';
    const res = await fetch(
      `${process.env.API_INTERNAL_URL || 'http://backend:8000/api/v1'}/orders/${orderNo}`,
      { headers: { Cookie: cookie } }
    );
    if (res.ok) {
      const data = await res.json();
      return {
        props: {
          orderNo: data.order_no,
          totalAmount: data.total_amount,
          pointEarned: Math.floor(data.total_amount * 0.05),
          items: data.items || [],
          status: data.status,
        },
      };
    }
  } catch {}
  return { props: { orderNo, totalAmount: 0, pointEarned: 0, items: [], status: 'unknown' } };
};

export default function OrderCompletePage({ orderNo, totalAmount, pointEarned, items, status }: Props) {
  return (
    <>
      <Head><title>주문완료 - YES24</title></Head>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0' }}>
        {/* Step breadcrumb */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 30 }}>
          {['장바구니', '주문/결제', '주문완료'].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: i === 2 ? '#0080ff' : '#d8d8d8',
                color: i === 2 ? '#fff' : '#999',
                fontSize: 12, fontWeight: 700, marginRight: 6,
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: i === 2 ? '#333' : '#999', fontWeight: i === 2 ? 700 : 400 }}>{step}</span>
              {i < 2 && <span style={{ margin: '0 15px', color: '#d8d8d8' }}>→</span>}
            </div>
          ))}
        </div>

        {/* Success message */}
        <div style={{ textAlign: 'center', padding: '40px 0', marginBottom: 30, border: '1px solid #ebebeb', borderRadius: 4, background: '#f8fbff' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#0080ff', color: '#fff', fontSize: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 15 }}>
            ✓
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#333', marginBottom: 8 }}>주문이 완료되었습니다</h2>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
            주문번호: <strong style={{ color: '#0080ff' }}>{orderNo}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#999' }}>
            결제금액: <strong style={{ color: '#333' }}>{totalAmount.toLocaleString()}원</strong>
            {' | '}
            적립 포인트: <strong style={{ color: '#0080ff' }}>{pointEarned.toLocaleString()}P</strong>
          </p>
          <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>예상 배송일: 주문일로부터 1~2일 이내 (주말/공휴일 제외)</p>
        </div>

        {/* Order items */}
        {items.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', paddingBottom: 8, borderBottom: '2px solid #333', marginBottom: 12 }}>
              주문상품
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'left' }}>상품명</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'center', width: 80 }}>수량</th>
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'right', width: 120 }}>금액</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #ebebeb' }}>{item.title}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600 }}>
                      {(item.price * item.quantity).toLocaleString()}원
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
          <Link href="/Member/OrderList" className="btnC btn_blue b_size" style={{ minWidth: 140, textAlign: 'center' }}>주문내역 확인</Link>
          <Link href="/main/default.aspx" className="btnC b_size" style={{ minWidth: 140, textAlign: 'center' }}>계속 쇼핑하기</Link>
        </div>
      </div>
    </>
  );
}
