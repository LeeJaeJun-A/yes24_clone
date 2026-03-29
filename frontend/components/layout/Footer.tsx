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
        {/* Top section - 4 columns */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 0', borderBottom: '1px solid #cbcbcb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 40 }}>
            {/* Column 1: 고객센터 */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>고객센터</div>
              <div style={{ fontSize: 11, color: '#666', lineHeight: 1.9 }}>
                <p>도서/음반/DVD : <strong style={{ color: '#333' }}>1544-3800</strong></p>
                <p>중고도서 : <strong style={{ color: '#333' }}>1566-4295</strong></p>
                <p>티켓예매 : <strong style={{ color: '#333' }}>1544-6399</strong></p>
                <p style={{ marginTop: 6, fontSize: 10, color: '#999' }}>
                  평일 09:00~18:00 (점심 12:00~13:00)<br />
                  토/일/공휴일 휴무
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                <Link href="/Service/Help?tab=inquiry" className="btnC m_size" style={{ textDecoration: 'none' }}>1:1 문의하기</Link>
                <Link href="/Service/Help" className="btnC m_size" style={{ textDecoration: 'none' }}>자주 묻는 질문</Link>
                <Link href="/Service/Hours" className="btnC m_size" style={{ textDecoration: 'none' }}>상담시간 안내</Link>
              </div>
            </div>

            {/* Column 2: 이용안내 */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>이용안내</div>
              <div style={{ fontSize: 11, color: '#666', lineHeight: 2.0 }}>
                <p><Link href="/Company/terms" style={{ color: '#666', textDecoration: 'none' }}>이용약관</Link></p>
                <p><Link href="/Company/privacy" style={{ color: '#333', fontWeight: 700, textDecoration: 'none' }}>개인정보처리방침</Link></p>
                <p><Link href="/Company/youth-policy" style={{ color: '#666', textDecoration: 'none' }}>청소년보호정책</Link></p>
                <p><Link href="/Company/book-promotion" style={{ color: '#666', textDecoration: 'none' }}>도서홍보안내</Link></p>
                <p><Link href="/Company/partnership" style={{ color: '#666', textDecoration: 'none' }}>제휴안내</Link></p>
              </div>
            </div>

            {/* Column 3: 회사소개 */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>회사소개</div>
              <div style={{ fontSize: 11, color: '#666', lineHeight: 2.0 }}>
                <p><Link href="/Company/about" style={{ color: '#666', textDecoration: 'none' }}>회사소개</Link></p>
                <p><Link href="/Company/careers" style={{ color: '#666', textDecoration: 'none' }}>인재채용</Link></p>
                <p><Link href="/Company/ad-info" style={{ color: '#666', textDecoration: 'none' }}>광고안내</Link></p>
                <p><Link href="/Company/store-info" style={{ color: '#666', textDecoration: 'none' }}>매장안내</Link></p>
              </div>
            </div>

            {/* Column 4: SNS */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10 }}>SNS</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: '카카오', short: 'K', bg: '#FAE100', color: '#3C1E1E' },
                  { label: 'Instagram', short: 'I', bg: '#E1306C', color: '#fff' },
                  { label: 'Facebook', short: 'F', bg: '#1877F2', color: '#fff' },
                  { label: 'YouTube', short: 'Y', bg: '#FF0000', color: '#fff' },
                ].map((s, i) => (
                  <a key={i} href="#" title={s.label} style={{
                    width: 32, height: 32, borderRadius: '50%', background: s.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: s.color, fontSize: 13, fontWeight: 700, textDecoration: 'none',
                  }}>
                    {s.short}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Middle section - Payment & Security badges */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 0', borderBottom: '1px solid #cbcbcb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#666', fontWeight: 700, marginRight: 4 }}>결제수단</span>
              {['신용카드', '계좌이체', '무통장입금', '휴대폰결제', '예스페이', '도서문화상품권', '문화상품권'].map((m, i) => (
                <span key={i} style={{
                  fontSize: 10, color: '#888', background: '#eee', border: '1px solid #ddd',
                  borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap',
                }}>
                  {m}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: '#666', fontWeight: 700, marginRight: 4 }}>보안인증</span>
              {['SSL 보안인증', '개인정보보호 우수사이트', '구매안전서비스'].map((c, i) => (
                <span key={i} style={{
                  fontSize: 10, color: '#888', background: '#eee', border: '1px solid #ddd',
                  borderRadius: 3, padding: '2px 6px', whiteSpace: 'nowrap',
                }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom section - Company info & copyright */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0 30px' }}>
          <div style={{ fontSize: 11, color: '#888', lineHeight: 1.8 }}>
            <div style={{ marginBottom: 10, fontSize: 18, fontWeight: 900, color: '#0080ff' }}>
              YES24
            </div>
            <p>예스이십사(주) 대표이사 : 김석환, 최세라 &nbsp;|&nbsp; 서울시 영등포구 은행로 11, 5층~6층(여의도동, 일신빌딩)</p>
            <p>사업자등록번호 : 229-81-37000 &nbsp;|&nbsp; 통신판매업신고 : 영등포구청 제2005-2호 &nbsp;|&nbsp; 호스팅 서비스사업자 : 예스이십사(주)</p>
            <p style={{ marginTop: 12, color: '#aaa' }}>Copyright &copy; YES24 Corp. All Rights Reserved.</p>
            <p style={{ color: '#aaa', fontSize: 10, marginTop: 5 }}>
              YES24는 통신판매중개자이며 통신판매의 당사자가 아닙니다. 상품, 상품정보, 거래에 관한 의무와 책임은 판매자에게 있습니다.
            </p>
            <p style={{ color: '#aaa', fontSize: 10, marginTop: 5 }}>
              ※ 이 사이트는 보안 SaaS 벤치마크 목적의 클론 사이트입니다.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
