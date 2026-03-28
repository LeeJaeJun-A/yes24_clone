import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function OrderConfirmPage() {
  const router = useRouter();
  const orderNo = router.query.order_no as string || '';

  return (
    <>
      <Head><title>주문 완료 - YES24</title></Head>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 60, paddingBottom: 60 }}>
        <div style={{ textAlign: 'center' }}>
          {/* Checkmark icon */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#0080ff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#333', marginBottom: 12 }}>
            주문이 완료되었습니다
          </h2>

          <p style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
            고객님의 주문이 정상적으로 완료되었습니다.
          </p>

          {orderNo && (
            <p style={{ fontSize: 13, color: '#999', marginBottom: 30 }}>
              주문번호: <strong style={{ color: '#0080ff' }}>{orderNo}</strong>
            </p>
          )}

          <div style={{
            background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 4,
            padding: '24px 30px', marginBottom: 30, maxWidth: 500, margin: '0 auto 30px',
            textAlign: 'left',
          }}>
            <ul style={{ listStyle: 'none', padding: 0, fontSize: 13, color: '#666', lineHeight: 2 }}>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0080ff" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 8 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                주문 확인 이메일이 발송됩니다.
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0080ff" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 8 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                배송 상태는 마이페이지에서 확인하실 수 있습니다.
              </li>
              <li>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0080ff" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: 8 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                일반 배송은 영업일 기준 2~3일 이내 도착합니다.
              </li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/" style={{
              display: 'inline-block', padding: '12px 32px', fontSize: 14,
              border: '1px solid #ccc', borderRadius: 2, textDecoration: 'none',
              color: '#333', background: '#fff',
            }}>
              쇼핑 계속하기
            </Link>
            {orderNo ? (
              <Link href={`/Member/OrderDetail/${orderNo}`} style={{
                display: 'inline-block', padding: '12px 32px', fontSize: 14,
                background: '#0080ff', color: '#fff', borderRadius: 2, textDecoration: 'none',
                border: '1px solid #0080ff',
              }}>
                주문 내역 보기
              </Link>
            ) : (
              <Link href="/Member/OrderList" style={{
                display: 'inline-block', padding: '12px 32px', fontSize: 14,
                background: '#0080ff', color: '#fff', borderRadius: 2, textDecoration: 'none',
                border: '1px solid #0080ff',
              }}>
                주문 내역 보기
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
