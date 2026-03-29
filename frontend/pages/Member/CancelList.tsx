import Head from 'next/head';
import MypageLayout from '@/components/layout/MypageLayout';

export default function CancelListPage() {
  return (
    <MypageLayout title="취소/반품/교환">
      <Head><title>취소/반품/교환 - YES24</title></Head>
      <div style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 4, padding: '60px 20px', textAlign: 'center', color: '#999' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
        <p style={{ fontSize: 14 }}>취소/반품/교환 내역이 없습니다.</p>
      </div>
    </MypageLayout>
  );
}
