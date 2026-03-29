import Head from 'next/head';
import Link from 'next/link';

export default function Custom404() {
  return (
    <>
      <Head><title>페이지를 찾을 수 없습니다 - YES24</title></Head>
      <div style={{
        maxWidth: 960, margin: '0 auto', padding: '80px 0', textAlign: 'center',
      }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 120, fontWeight: 900, color: '#ebebeb', lineHeight: 1 }}>404</div>
          <div style={{ fontSize: 48, color: '#ddd', marginTop: -10 }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="1">
              <circle cx="12" cy="12" r="10"/>
              <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </div>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#333', marginBottom: 12 }}>
          페이지를 찾을 수 없습니다
        </h1>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 8, lineHeight: 1.7 }}>
          요청하신 페이지가 존재하지 않거나, 잘못된 주소를 입력하셨습니다.
        </p>
        <p style={{ fontSize: 13, color: '#999', marginBottom: 30 }}>
          URL을 다시 확인해 주세요.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link href="/main/default.aspx" className="btnC btn_blue b_size" style={{ minWidth: 140 }}>
            홈으로
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btnC b_size"
            style={{ minWidth: 140 }}
          >
            이전 페이지
          </button>
        </div>
        <div style={{ marginTop: 40, fontSize: 12, color: '#ccc' }}>
          YES24 고객센터 1544-3800 (평일 09:00~18:00)
        </div>
      </div>
    </>
  );
}
