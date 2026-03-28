import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ minWidth: 960 }}>
      {/* Floating tools */}
      <div className="toolBtn">
        <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} title="맨위로">
          ↑
        </a>
      </div>

      <div style={{ background: '#dfdfdf', borderTop: '1px solid #cbcbcb', marginTop: 40 }}>
        {/* Top links */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '15px 0', borderBottom: '1px solid #cbcbcb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { label: '회사소개', slug: 'about' },
                { label: '인재채용', slug: 'careers' },
                { label: '이용약관', slug: 'terms' },
              ].map((t) => (
                <Link key={t.slug} href={`/Company/${t.slug}`} style={{ color: '#666', fontSize: 12 }}>{t.label}</Link>
              ))}
              <Link href="/Company/privacy" style={{ color: '#333', fontSize: 12, fontWeight: 700 }}>개인정보처리방침</Link>
              {[
                { label: '청소년보호정책', slug: 'youth-policy' },
                { label: '도서홍보안내', slug: 'book-promotion' },
                { label: '광고안내', slug: 'ad-info' },
                { label: '제휴안내', slug: 'partnership' },
                { label: '매장안내', slug: 'store-info' },
              ].map((t) => (
                <Link key={t.slug} href={`/Company/${t.slug}`} style={{ color: '#666', fontSize: 12 }}>{t.label}</Link>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['카카오', 'Facebook', 'X', 'Instagram'].map((s, i) => (
                <a key={i} href="#" style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#999',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 10, fontWeight: 700, textDecoration: 'none',
                }}>
                  {s[0]}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Company info + CS */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0 30px', display: 'flex', gap: 40 }}>
          <div style={{ flex: 1, fontSize: 11, color: '#888', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 10, fontSize: 18, fontWeight: 900, color: '#0080ff' }}>
              YES24
            </div>
            <p>예스이십사(주) 대표이사 : 김석환, 최세라</p>
            <p>서울시 영등포구 은행로 11, 5층~6층(여의도동, 일신빌딩)</p>
            <p>사업자등록번호 : 229-81-37000 &nbsp; 통신판매업신고 : 영등포구청 제2005-2호</p>
            <p>호스팅 서비스사업자 : 예스이십사(주)</p>
            <p style={{ marginTop: 10, color: '#aaa' }}>Copyright © YES24 Corp. All Rights Reserved.</p>
            <p style={{ color: '#aaa', fontSize: 10, marginTop: 5 }}>
              ※ 이 사이트는 보안 SaaS 벤치마크 목적의 클론 사이트입니다.
            </p>
          </div>
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                <strong>고객센터</strong>
              </div>
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
                <p>도서/음반/DVD : <strong style={{ color: '#333' }}>1544-3800</strong></p>
                <p>중고도서 : <strong style={{ color: '#333' }}>1566-4295</strong></p>
                <p>티켓예매 : <strong style={{ color: '#333' }}>1544-6399</strong></p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Link href="/Service/Help?tab=inquiry" className="btnC m_size" style={{ textDecoration: 'none' }}>1:1 문의하기</Link>
              <Link href="/Service/Help" className="btnC m_size" style={{ textDecoration: 'none' }}>자주 묻는 질문</Link>
              <Link href="/Service/Hours" className="btnC m_size" style={{ textDecoration: 'none' }}>상담시간 안내</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
