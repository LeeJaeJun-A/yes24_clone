import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { Coupon } from '@/lib/types';
import MypageLayout from '@/components/layout/MypageLayout';

interface Props { coupons: Coupon[]; }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const cookie = ctx.req.headers.cookie || '';
  const base = process.env.API_INTERNAL_URL || 'http://backend:8000/api/v1';
  try {
    const res = await fetch(`${base}/users/me/coupons`, { headers: { Cookie: cookie } });
    if (res.ok) return { props: { coupons: await res.json() } };
  } catch {}
  return { redirect: { destination: '/Templates/FTLogin', permanent: false } };
};

export default function CouponsPage({ coupons }: Props) {
  const available = coupons.filter(c => c.status === '사용가능');
  const expired = coupons.filter(c => c.status !== '사용가능');

  return (
    <MypageLayout title="쿠폰함">
      <Head><title>쿠폰함 - YES24</title></Head>

        {available.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12 }}>사용 가능 쿠폰</h3>
            {available.map(c => (
              <div key={c.id} style={{
                display: 'flex', border: '1px solid #0080ff', borderRadius: 6, overflow: 'hidden', marginBottom: 10,
                background: 'linear-gradient(90deg, #e5f2ff 0%, #fff 30%)',
              }}>
                <div style={{ width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, borderRight: '1px dashed #0080ff' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#0080ff' }}>
                    {c.discount_type === 'PERCENT' ? `${c.discount_value}%` : `${c.discount_value.toLocaleString()}원`}
                  </div>
                  <div style={{ fontSize: 11, color: '#0080ff' }}>할인</div>
                </div>
                <div style={{ flex: 1, padding: '14px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    {c.min_order_amount > 0 && <span>{c.min_order_amount.toLocaleString()}원 이상 구매 시 </span>}
                    {c.max_discount && <span>| 최대 {c.max_discount.toLocaleString()}원 할인</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{c.end_date}까지</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                  <span style={{ padding: '4px 10px', background: '#0080ff', color: '#fff', borderRadius: 3, fontSize: 12, fontWeight: 700 }}>사용가능</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {expired.length > 0 && (
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#999', marginBottom: 12 }}>만료/사용완료 쿠폰</h3>
            {expired.map(c => (
              <div key={c.id} style={{
                display: 'flex', border: '1px solid #ebebeb', borderRadius: 6, overflow: 'hidden', marginBottom: 10, opacity: 0.6,
              }}>
                <div style={{ width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, borderRight: '1px dashed #ddd' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#999' }}>
                    {c.discount_type === 'PERCENT' ? `${c.discount_value}%` : `${c.discount_value.toLocaleString()}원`}
                  </div>
                </div>
                <div style={{ flex: 1, padding: '14px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#999', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: '#bbb' }}>{c.end_date}까지</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px' }}>
                  <span style={{ padding: '4px 10px', background: '#f5f5f5', color: '#999', borderRadius: 3, fontSize: 12 }}>{c.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
    </MypageLayout>
  );
}
