import Head from 'next/head';
import MypageLayout from '@/components/layout/MypageLayout';

export default function InquiryPage() {
  return (
    <MypageLayout title="1:1 문의">
      <Head><title>1:1 문의 - YES24</title></Head>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button style={{ padding: '8px 16px', background: '#0080ff', color: '#fff', border: 'none', borderRadius: 3, fontSize: 13, cursor: 'pointer' }}>
          + 문의하기
        </button>
      </div>
      <div style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 4, padding: '60px 20px', textAlign: 'center', color: '#999' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
        <p style={{ fontSize: 14 }}>문의 내역이 없습니다.</p>
        <p style={{ fontSize: 12, marginTop: 8 }}>궁금한 점이 있으시면 1:1 문의를 이용해 주세요.</p>
      </div>
    </MypageLayout>
  );
}
