import Head from 'next/head';
import Link from 'next/link';

export default function ServiceHoursPage() {
  const sections = [
    {
      title: '도서/음반/DVD 고객센터',
      phone: '1544-3800',
      hours: [
        { day: '평일', time: '09:00 ~ 18:00' },
        { day: '토요일', time: '09:00 ~ 13:00' },
        { day: '일요일/공휴일', time: '휴무' },
      ],
    },
    {
      title: '중고도서 고객센터',
      phone: '1566-4295',
      hours: [
        { day: '평일', time: '09:00 ~ 18:00' },
        { day: '토/일/공휴일', time: '휴무' },
      ],
    },
    {
      title: '티켓예매 고객센터',
      phone: '1544-6399',
      hours: [
        { day: '평일', time: '09:00 ~ 18:00' },
        { day: '토요일', time: '09:00 ~ 17:00' },
        { day: '일요일/공휴일', time: '휴무' },
      ],
    },
  ];

  return (
    <>
      <Head><title>상담시간 안내 - YES24</title></Head>
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <Link href="/Service/Help">고객센터</Link>
          <span className="ico_arr">&gt;</span>
          <span style={{ color: '#333' }}>상담시간 안내</span>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          상담시간 안내
        </h1>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 }}>
          {sections.map((sec) => (
            <div key={sec.phone} style={{ border: '1px solid #d8d8d8', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', background: '#f8f8f8', borderBottom: '1px solid #d8d8d8' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4 }}>{sec.title}</h3>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#0080ff' }}>{sec.phone}</div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <tbody>
                    {sec.hours.map((h) => (
                      <tr key={h.day}>
                        <td style={{ padding: '6px 0', color: '#666', width: 100 }}>{h.day}</td>
                        <td style={{ padding: '6px 0', fontWeight: 500, color: h.time === '휴무' ? '#ff6666' : '#333' }}>{h.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: 20, background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 3, marginBottom: 30 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 10 }}>유의사항</h3>
          <ul style={{ fontSize: 12, color: '#666', lineHeight: 1.8, paddingLeft: 16, listStyle: 'disc' }}>
            <li>점심시간 (12:00 ~ 13:00)에는 상담이 지연될 수 있습니다.</li>
            <li>전화 상담이 어려운 경우 <Link href="/Service/Help?tab=inquiry" style={{ color: '#0080ff' }}>1:1 문의하기</Link>를 이용해 주세요.</li>
            <li>공휴일 및 대체공휴일은 휴무입니다.</li>
            <li>상담 대기가 많을 경우 연결이 지연될 수 있습니다.</li>
          </ul>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/Service/Help" className="btnC btn_blue b_size">자주 묻는 질문</Link>
          <Link href="/Service/Help?tab=inquiry" className="btnC b_size">1:1 문의하기</Link>
        </div>
      </div>
    </>
  );
}
