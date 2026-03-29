import Head from 'next/head';
import Link from 'next/link';

export default function HoursPage() {
  return (
    <>
      <Head><title>이용시간 안내 - YES24</title></Head>
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link><span className="ico_arr">&gt;</span>
          <Link href="/Service/Help">고객센터</Link><span className="ico_arr">&gt;</span>
          <span>이용시간 안내</span>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          이용시간 안내
        </h2>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 30 }}>
          <thead>
            <tr style={{ background: '#f8f8f8' }}>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #333', textAlign: 'left', fontWeight: 700, width: 200 }}>서비스</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #333', textAlign: 'left', fontWeight: 700 }}>이용시간</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #333', textAlign: 'left', fontWeight: 700 }}>비고</th>
            </tr>
          </thead>
          <tbody>
            {[
              { service: '인터넷 서점', hours: '24시간 연중무휴', note: '시스템 점검 시 일시 중단될 수 있습니다' },
              { service: '전화 상담', hours: '평일 09:00 ~ 18:00', note: '점심시간 12:00 ~ 13:00' },
              { service: '카카오톡 상담', hours: '평일 09:00 ~ 18:00', note: '주말/공휴일 휴무' },
              { service: '1:1 문의 접수', hours: '24시간', note: '답변은 영업일 기준 1~2일 소요' },
              { service: '당일 배송 주문', hours: '평일 오후 2시까지', note: '재고 상황에 따라 변동 가능' },
              { service: '반품/교환 접수', hours: '평일 09:00 ~ 18:00', note: '수령 후 10일 이내' },
            ].map((row, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #ebebeb' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500, color: '#333' }}>{row.service}</td>
                <td style={{ padding: '12px 16px', color: '#333' }}>{row.hours}</td>
                <td style={{ padding: '12px 16px', color: '#999' }}>{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Contact info */}
        <div style={{ padding: 24, background: '#f8f8f8', borderRadius: 4, marginBottom: 40 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 12 }}>연락처 안내</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, fontSize: 13 }}>
            <div>
              <div style={{ color: '#999', marginBottom: 4 }}>고객센터 전화번호</div>
              <div style={{ fontWeight: 700, color: '#0080ff', fontSize: 18 }}>1544-3800</div>
            </div>
            <div>
              <div style={{ color: '#999', marginBottom: 4 }}>팩스</div>
              <div style={{ fontWeight: 500, color: '#333' }}>02-6923-3800</div>
            </div>
            <div>
              <div style={{ color: '#999', marginBottom: 4 }}>이메일</div>
              <div style={{ fontWeight: 500, color: '#333' }}>help@yes24clone.com</div>
            </div>
            <div>
              <div style={{ color: '#999', marginBottom: 4 }}>카카오톡</div>
              <div style={{ fontWeight: 500, color: '#333' }}>@yes24</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
