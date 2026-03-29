import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

interface Props {
  slug: string;
  title: string;
  content: string;
}

const CONTENT: Record<string, { title: string; content: string }> = {
  about: {
    title: '회사소개',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">YES24 소개</h3>
      <p>YES24는 1999년 설립된 대한민국 최대의 인터넷 서점이자 종합 문화 플랫폼입니다.</p>
      <p style="margin-top:8px;">설립 이래 "문화를 통한 행복 창출"이라는 비전 아래 도서, 음반, DVD, 공연 티켓, eBook 등 다양한 문화 상품을 온라인으로 제공해 왔습니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:20px 0 10px;">연혁</h4>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid #ebebeb;"><td style="padding:8px;font-weight:700;width:80px;color:#0080ff;">1999</td><td style="padding:8px;">(주)예스이십사 설립, 인터넷 서점 YES24 오픈</td></tr>
        <tr style="border-bottom:1px solid #ebebeb;"><td style="padding:8px;font-weight:700;color:#0080ff;">2003</td><td style="padding:8px;">공연 티켓 예매 서비스 시작, 연 매출 1,000억 원 돌파</td></tr>
        <tr style="border-bottom:1px solid #ebebeb;"><td style="padding:8px;font-weight:700;color:#0080ff;">2007</td><td style="padding:8px;">eBook 서비스 런칭, 중고매장 '중고샵' 오픈</td></tr>
        <tr style="border-bottom:1px solid #ebebeb;"><td style="padding:8px;font-weight:700;color:#0080ff;">2010</td><td style="padding:8px;">모바일 앱 출시, 누적 회원 수 1,000만 명 돌파</td></tr>
        <tr style="border-bottom:1px solid #ebebeb;"><td style="padding:8px;font-weight:700;color:#0080ff;">2015</td><td style="padding:8px;">크레마(Crema) 전자책 단말기 출시, AI 추천 시스템 도입</td></tr>
        <tr style="border-bottom:1px solid #ebebeb;"><td style="padding:8px;font-weight:700;color:#0080ff;">2020</td><td style="padding:8px;">구독 서비스 '크레마클럽' 런칭, 비대면 독서 문화 확산 기여</td></tr>
        <tr><td style="padding:8px;font-weight:700;color:#0080ff;">2024</td><td style="padding:8px;">누적 회원 수 2,500만 명 돌파, ESG 경영 본격 추진</td></tr>
      </table>

      <h4 style="font-size:14px;font-weight:700;margin:20px 0 10px;">경영 이념</h4>
      <p>"고객에게 최고의 문화 경험을 제공하고, 출판 생태계와 함께 성장하는 기업"</p>
      <p style="margin-top:8px;">YES24는 독자와 저자, 출판사를 연결하는 플랫폼으로서 건강한 독서 문화 조성에 힘쓰고 있습니다.</p>
    `,
  },
  careers: {
    title: '인재채용',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">YES24 인재채용</h3>
      <p>YES24는 문화와 기술의 융합을 이끌어갈 열정적인 인재를 기다리고 있습니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:20px 0 10px;">인재상</h4>
      <div style="display:flex;gap:16px;margin-bottom:20px;">
        <div style="flex:1;background:#f8f8f8;padding:16px;border-radius:4px;text-align:center;">
          <div style="font-size:24px;margin-bottom:8px;">&#x1F4DA;</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">문화 감수성</div>
          <div style="font-size:11px;color:#666;">콘텐츠에 대한 깊은 이해와 감각</div>
        </div>
        <div style="flex:1;background:#f8f8f8;padding:16px;border-radius:4px;text-align:center;">
          <div style="font-size:24px;margin-bottom:8px;">&#x1F680;</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">혁신적 사고</div>
          <div style="font-size:11px;color:#666;">새로운 가치를 창출하는 도전정신</div>
        </div>
        <div style="flex:1;background:#f8f8f8;padding:16px;border-radius:4px;text-align:center;">
          <div style="font-size:24px;margin-bottom:8px;">&#x1F91D;</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:4px;">협업 능력</div>
          <div style="font-size:11px;color:#666;">함께 성장하는 팀워크</div>
        </div>
      </div>

      <h4 style="font-size:14px;font-weight:700;margin:20px 0 10px;">채용 분야</h4>
      <ul style="list-style:disc;padding-left:20px;font-size:13px;line-height:2;">
        <li>IT 개발 (프론트엔드, 백엔드, 데이터 엔지니어링, DevOps)</li>
        <li>서비스 기획 (UX/UI, 상품 기획, 프로모션 기획)</li>
        <li>마케팅 (퍼포먼스 마케팅, 브랜드 마케팅, CRM)</li>
        <li>MD (도서, 음반, 문구, 공연)</li>
        <li>경영지원 (재무, 인사, 법무)</li>
      </ul>

      <p style="margin-top:16px;color:#999;font-size:12px;">채용 관련 문의: recruit@yes24.com</p>
    `,
  },
  terms: {
    title: '이용약관',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">이용약관</h3>
      <p style="font-size:12px;color:#999;margin-bottom:16px;">시행일: 2024년 1월 1일</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">제1조 (목적)</h4>
      <p>이 약관은 주식회사 예스이십사(이하 "회사")가 운영하는 인터넷 사이트(이하 "사이트")에서 제공하는 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리, 의무, 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">제2조 (정의)</h4>
      <ol style="padding-left:20px;font-size:13px;line-height:1.8;">
        <li>"사이트"란 회사가 재화 또는 용역을 이용자에게 제공하기 위하여 컴퓨터 등 정보통신설비를 이용하여 재화 또는 용역을 거래할 수 있도록 설정한 가상의 영업장을 말합니다.</li>
        <li>"이용자"란 사이트에 접속하여 이 약관에 따라 사이트가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.</li>
        <li>"회원"이란 사이트에 개인정보를 제공하여 회원등록을 한 자로서, 사이트의 정보를 지속적으로 제공받으며 사이트가 제공하는 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
      </ol>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">제3조 (약관의 게시와 개정)</h4>
      <p>회사는 이 약관의 내용과 상호, 영업소 소재지 주소, 대표자의 성명, 사업자등록번호 등을 이용자가 쉽게 알 수 있도록 사이트의 초기 서비스 화면에 게시합니다. 다만, 약관의 내용은 이용자가 연결화면을 통하여 볼 수 있도록 할 수 있습니다.</p>
      <p style="margin-top:8px;">회사는 필요하다고 인정되는 경우 관련 법령에 위배되지 않는 범위 내에서 이 약관을 개정할 수 있으며, 개정된 약관은 적용일자 7일 이전부터 공지합니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">제4조 (서비스의 제공 및 변경)</h4>
      <p>회사는 다음과 같은 서비스를 제공합니다:</p>
      <ul style="padding-left:20px;font-size:13px;line-height:1.8;">
        <li>도서 및 문화 상품의 판매</li>
        <li>eBook 및 디지털 콘텐츠 제공</li>
        <li>공연 티켓 예매 서비스</li>
        <li>중고 도서 거래 중개 서비스</li>
        <li>기타 회사가 정하는 서비스</li>
      </ul>
    `,
  },
  privacy: {
    title: '개인정보처리방침',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">개인정보처리방침</h3>
      <p style="font-size:12px;color:#999;margin-bottom:16px;">시행일: 2024년 1월 1일 | 개인정보보호책임자: 홍길동 (privacy@yes24.com)</p>

      <p>주식회사 예스이십사(이하 "회사")는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」 등 관계 법령을 준수합니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">1. 수집하는 개인정보 항목</h4>
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #ebebeb;">
        <thead><tr style="background:#f8f8f8;"><th style="padding:8px;border:1px solid #ebebeb;text-align:left;">구분</th><th style="padding:8px;border:1px solid #ebebeb;text-align:left;">항목</th></tr></thead>
        <tbody>
          <tr><td style="padding:8px;border:1px solid #ebebeb;">필수</td><td style="padding:8px;border:1px solid #ebebeb;">이메일, 비밀번호, 이름, 휴대폰번호</td></tr>
          <tr><td style="padding:8px;border:1px solid #ebebeb;">선택</td><td style="padding:8px;border:1px solid #ebebeb;">생년월일, 성별, 주소, 관심분야</td></tr>
          <tr><td style="padding:8px;border:1px solid #ebebeb;">자동수집</td><td style="padding:8px;border:1px solid #ebebeb;">IP주소, 쿠키, 접속로그, 방문일시, 서비스 이용기록</td></tr>
        </tbody>
      </table>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">2. 개인정보 처리 목적</h4>
      <ul style="padding-left:20px;font-size:13px;line-height:1.8;">
        <li>회원 가입 및 관리: 본인 확인, 서비스 제공, 고지사항 전달</li>
        <li>서비스 제공: 상품 배송, 콘텐츠 제공, 결제 처리</li>
        <li>마케팅 활용: 맞춤형 추천, 이벤트 안내 (동의 시)</li>
      </ul>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">3. 보유 및 이용 기간</h4>
      <p>회원 탈퇴 시 즉시 파기합니다. 단, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
      <ul style="padding-left:20px;font-size:12px;line-height:1.8;color:#666;">
        <li>전자상거래 거래기록: 5년 (전자상거래법)</li>
        <li>소비자 불만 처리: 3년 (전자상거래법)</li>
        <li>접속기록: 3개월 (통신비밀보호법)</li>
      </ul>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">4. 이용자의 권리</h4>
      <p>이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요구할 수 있으며, 마이페이지 또는 고객센터를 통해 가능합니다.</p>
    `,
  },
  'youth-policy': {
    title: '청소년보호정책',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">청소년보호정책</h3>
      <p>주식회사 예스이십사는 청소년이 건전한 인격체로 성장할 수 있도록 「청소년 보호법」에 근거하여 청소년보호정책을 수립, 시행하고 있습니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">청소년 유해매체물 표시</h4>
      <p>회사는 청소년 유해매체물로 지정된 상품에 대해 19세 미만 구매 불가 표시를 하며, 구매 시 성인 인증을 요구합니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">청소년보호 책임자</h4>
      <p>성명: 김보호 | 소속: 서비스운영팀 | 연락처: youth@yes24.com</p>
    `,
  },
  'book-promotion': {
    title: '도서홍보안내',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">도서홍보안내</h3>
      <p>YES24에 도서 홍보를 원하시는 출판사 및 저자분들께 다양한 마케팅 채널을 제공하고 있습니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">홍보 채널</h4>
      <ul style="padding-left:20px;font-size:13px;line-height:2;">
        <li><strong>메인 배너</strong> - YES24 메인 페이지 상단 노출</li>
        <li><strong>카테고리 추천</strong> - 분야별 MD 추천 도서 선정</li>
        <li><strong>이메일 뉴스레터</strong> - 분야별 구독 회원 대상 발송</li>
        <li><strong>SNS 마케팅</strong> - YES24 공식 계정을 통한 홍보</li>
        <li><strong>저자 인터뷰</strong> - 북로그 및 채널예스를 통한 인터뷰 기사</li>
      </ul>

      <p style="margin-top:16px;">도서 홍보 문의: marketing@yes24.com</p>
    `,
  },
  'ad-info': {
    title: '광고안내',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">광고안내</h3>
      <p>YES24는 월 방문자 수 3,000만 명 이상의 대한민국 대표 문화 플랫폼입니다. 다양한 광고 상품을 통해 효과적인 마케팅이 가능합니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">광고 상품</h4>
      <table style="width:100%;border-collapse:collapse;font-size:12px;border:1px solid #ebebeb;">
        <thead><tr style="background:#f8f8f8;"><th style="padding:8px;border:1px solid #ebebeb;">상품명</th><th style="padding:8px;border:1px solid #ebebeb;">위치</th><th style="padding:8px;border:1px solid #ebebeb;">단가(VAT별도)</th></tr></thead>
        <tbody>
          <tr><td style="padding:8px;border:1px solid #ebebeb;">메인 상단 배너</td><td style="padding:8px;border:1px solid #ebebeb;">메인 페이지</td><td style="padding:8px;border:1px solid #ebebeb;">주당 500만원~</td></tr>
          <tr><td style="padding:8px;border:1px solid #ebebeb;">카테고리 배너</td><td style="padding:8px;border:1px solid #ebebeb;">분야별 페이지</td><td style="padding:8px;border:1px solid #ebebeb;">주당 200만원~</td></tr>
          <tr><td style="padding:8px;border:1px solid #ebebeb;">검색 키워드</td><td style="padding:8px;border:1px solid #ebebeb;">검색결과 상단</td><td style="padding:8px;border:1px solid #ebebeb;">월 100만원~</td></tr>
        </tbody>
      </table>

      <p style="margin-top:16px;">광고 문의: ad@yes24.com / 02-6282-1000</p>
    `,
  },
  partnership: {
    title: '제휴안내',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">제휴안내</h3>
      <p>YES24는 다양한 기업 및 기관과의 파트너십을 통해 함께 성장하고 있습니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">제휴 유형</h4>
      <ul style="padding-left:20px;font-size:13px;line-height:2;">
        <li><strong>포인트 제휴</strong> - 타사 포인트와 YES포인트 교차 적립/사용</li>
        <li><strong>할인 제휴</strong> - 제휴 카드 / 멤버십 할인 프로그램</li>
        <li><strong>콘텐츠 제휴</strong> - 도서 데이터, 리뷰, 추천 API 제공</li>
        <li><strong>복지몰 제휴</strong> - 기업 임직원 특별 할인</li>
        <li><strong>도서관 납품</strong> - 공공/기업 도서관 납품 서비스</li>
      </ul>

      <p style="margin-top:16px;">제휴 문의: partnership@yes24.com</p>
    `,
  },
  'store-info': {
    title: '매장안내',
    content: `
      <h3 style="font-size:16px;font-weight:700;margin-bottom:12px;">매장안내</h3>
      <p>YES24는 온라인뿐만 아니라 오프라인 매장에서도 만나보실 수 있습니다.</p>

      <h4 style="font-size:14px;font-weight:700;margin:16px 0 8px;">매장 안내</h4>
      <div style="border:1px solid #ebebeb;border-radius:4px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px;">YES24 강남점</div>
        <p style="font-size:12px;color:#666;margin-bottom:4px;">서울특별시 강남구 테헤란로 152 (역삼동)</p>
        <p style="font-size:12px;color:#666;margin-bottom:4px;">영업시간: 10:00 ~ 22:00 (연중무휴)</p>
        <p style="font-size:12px;color:#666;">02-6282-1000</p>
      </div>
      <div style="border:1px solid #ebebeb;border-radius:4px;padding:16px;margin-bottom:16px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px;">YES24 홍대점</div>
        <p style="font-size:12px;color:#666;margin-bottom:4px;">서울특별시 마포구 양화로 160 (동교동)</p>
        <p style="font-size:12px;color:#666;margin-bottom:4px;">영업시간: 10:00 ~ 22:00 (연중무휴)</p>
        <p style="font-size:12px;color:#666;">02-6282-2000</p>
      </div>
      <div style="border:1px solid #ebebeb;border-radius:4px;padding:16px;">
        <div style="font-weight:700;font-size:14px;margin-bottom:8px;">YES24 판교점</div>
        <p style="font-size:12px;color:#666;margin-bottom:4px;">경기도 성남시 분당구 판교역로 235 (삼평동)</p>
        <p style="font-size:12px;color:#666;margin-bottom:4px;">영업시간: 10:00 ~ 21:00 (연중무휴)</p>
        <p style="font-size:12px;color:#666;">031-600-3000</p>
      </div>
    `,
  },
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const slug = ctx.params?.slug as string;
  const page = CONTENT[slug];

  if (page) {
    return { props: { slug, title: page.title, content: page.content } };
  }

  return { props: { slug, title: '', content: '' } };
};

export default function CompanyPage({ slug, title, content }: Props) {
  if (!title) {
    return (
      <>
        <Head><title>페이지를 찾을 수 없습니다 - YES24</title></Head>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: 80, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 20 }}>요청하신 페이지를 찾을 수 없습니다.</p>
          <Link href="/" style={{
            display: 'inline-block', padding: '10px 24px', fontSize: 13,
            color: '#fff', background: '#0080ff', borderRadius: 2, textDecoration: 'none',
          }}>
            홈으로 이동
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head><title>{title} - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>{title}</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          {title}
        </h2>

        <div
          dangerouslySetInnerHTML={{ __html: content }}
          style={{ fontSize: 13, lineHeight: 1.8, color: '#333', marginBottom: 40 }}
        />
      </div>
    </>
  );
}
