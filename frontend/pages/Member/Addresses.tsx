import Head from 'next/head';
import MypageLayout from '@/components/layout/MypageLayout';

export default function AddressesPage() {
  return (
    <MypageLayout title="배송지관리">
      <Head><title>배송지관리 - YES24</title></Head>
      <div style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 4, padding: '60px 20px', textAlign: 'center', color: '#999' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏠</div>
        <p style={{ fontSize: 14 }}>등록된 배송지가 없습니다.</p>
        <button style={{ marginTop: 16, padding: '8px 20px', background: '#0080ff', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, cursor: 'pointer' }}>
          + 배송지 추가
        </button>
      </div>
    </MypageLayout>
  );
}
