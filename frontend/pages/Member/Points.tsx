import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { User, PointHistory } from '@/lib/types';
import MypageLayout from '@/components/layout/MypageLayout';

interface Props { user: User; history: PointHistory[]; }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const cookie = ctx.req.headers.cookie || '';
  const base = process.env.API_INTERNAL_URL || 'http://backend:8000/api/v1';
  try {
    const [userRes, historyRes] = await Promise.all([
      fetch(`${base}/auth/me`, { headers: { Cookie: cookie } }),
      fetch(`${base}/users/points-history`, { headers: { Cookie: cookie } }),
    ]);
    if (!userRes.ok) throw new Error();
    const user = await userRes.json();
    const history = historyRes.ok ? await historyRes.json() : [];
    return { props: { user, history: Array.isArray(history) ? history : [] } };
  } catch {
    return { redirect: { destination: '/Templates/FTLogin', permanent: false } };
  }
};

export default function PointsPage({ user, history }: Props) {
  return (
    <MypageLayout title="YES포인트">
      <Head><title>YES포인트 - YES24</title></Head>

        {/* Balance card */}
        <div style={{
          background: 'linear-gradient(135deg, #0080ff, #0043ff)', borderRadius: 8,
          padding: '30px 40px', marginBottom: 30, color: '#fff',
        }}>
          <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>현재 보유 포인트</div>
          <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>
            {(user.point_balance || 0).toLocaleString()}<span style={{ fontSize: 18, fontWeight: 400 }}>원</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{user.username}님 ({user.grade || '일반회원'})</div>
        </div>

        {/* History table */}
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333', paddingBottom: 10, borderBottom: '2px solid #333', marginBottom: 0 }}>
          포인트 내역
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'left', fontWeight: 600 }}>날짜</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'left', fontWeight: 600 }}>내용</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600 }}>적립/사용</th>
              <th style={{ padding: '10px 12px', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600 }}>잔액</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#999' }}>포인트 내역이 없습니다.</td></tr>
            ) : (
              history.map((h, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #ebebeb' }}>
                  <td style={{ padding: '10px 12px', color: '#999' }}>{h.date}</td>
                  <td style={{ padding: '10px 12px', color: '#333' }}>{h.description}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: h.amount > 0 ? '#0080ff' : '#ff6666' }}>
                    {h.amount > 0 ? '+' : ''}{h.amount.toLocaleString()}원
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#333' }}>{h.balance.toLocaleString()}원</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
    </MypageLayout>
  );
}
