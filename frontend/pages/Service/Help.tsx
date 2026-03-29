import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { FAQ } from '@/lib/types';

const CATEGORIES = [
  { key: '주문/결제', label: '주문/결제' },
  { key: '배송', label: '배송' },
  { key: '취소/반품', label: '취소/반품' },
  { key: '회원/혜택', label: '회원/혜택' },
];

const MOCK_FAQ: FAQ[] = [
  { id: 1, category: '주문/결제', question: '결제 수단은 어떤 것이 있나요?', answer: '신용카드, 체크카드, 실시간 계좌이체, 무통장 입금, YES포인트, 문화상품권 등으로 결제하실 수 있습니다.', display_order: 1 },
  { id: 2, category: '주문/결제', question: '주문 후 결제 방법을 변경할 수 있나요?', answer: '결제 완료 전이라면 주문을 취소하고 다시 주문하시면 됩니다. 결제 완료 후에는 변경이 불가능합니다.', display_order: 2 },
  { id: 3, category: '주문/결제', question: '여러 상품을 한 번에 주문할 수 있나요?', answer: '네, 카트에 여러 상품을 담은 후 한 번에 주문하실 수 있습니다.', display_order: 3 },
  { id: 4, category: '배송', question: '배송은 얼마나 걸리나요?', answer: '평일 오후 2시 이전 주문 시 당일 출고되며, 출고 후 1~2일 내 도착합니다. 도서산간 지역은 추가 시일이 소요될 수 있습니다.', display_order: 1 },
  { id: 5, category: '배송', question: '배송비는 얼마인가요?', answer: '2만원 이상 구매 시 무료배송이며, 2만원 미만 구매 시 배송비 2,500원이 부과됩니다.', display_order: 2 },
  { id: 6, category: '배송', question: '해외 배송이 가능한가요?', answer: '현재 해외 배송은 지원되지 않습니다. 국내 배송만 가능합니다.', display_order: 3 },
  { id: 7, category: '취소/반품', question: '주문 취소는 어떻게 하나요?', answer: '마이페이지 > 주문내역에서 주문 취소가 가능합니다. 배송 시작 후에는 반품 절차를 진행해 주세요.', display_order: 1 },
  { id: 8, category: '취소/반품', question: '반품은 어떻게 하나요?', answer: '상품 수령 후 10일 이내에 고객센터로 연락하시면 반품 접수가 가능합니다. 상품 하자의 경우 배송비는 당사 부담입니다.', display_order: 2 },
  { id: 9, category: '회원/혜택', question: 'YES포인트는 어떻게 적립하나요?', answer: '도서 구매 시 결제금액의 5%가 YES포인트로 적립됩니다. 리뷰 작성 시 추가 포인트가 적립됩니다.', display_order: 1 },
  { id: 10, category: '회원/혜택', question: '회원 등급은 어떻게 결정되나요?', answer: '최근 3개월간 구매 금액에 따라 SILVER, GOLD, PLATINUM, DIAMOND 등급이 결정됩니다.', display_order: 2 },
];

interface Props { faqItems: FAQ[]; }

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const base = process.env.API_INTERNAL_URL || 'http://backend:8000/api/v1';
    const res = await fetch(`${base}/customer/faq`);
    if (res.ok) {
      const data = await res.json();
      return { props: { faqItems: data.length > 0 ? data : MOCK_FAQ } };
    }
  } catch {}
  return { props: { faqItems: MOCK_FAQ } };
};

export default function HelpPage({ faqItems }: Props) {
  const [activeCategory, setActiveCategory] = useState('주문/결제');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaq = searchQuery
    ? faqItems.filter(f => f.question.includes(searchQuery) || f.answer.includes(searchQuery))
    : faqItems.filter(f => f.category === activeCategory);

  return (
    <>
      <Head><title>고객센터 - YES24</title></Head>
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link><span className="ico_arr">&gt;</span><span>고객센터</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          고객센터
        </h2>

        {/* Search */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="궁금하신 내용을 검색해 보세요"
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #d8d8d8', borderRadius: 3, fontSize: 13 }}
            />
            <button className="btnC btn_blue b_size" style={{ padding: '10px 24px' }}>검색</button>
          </div>
        </div>

        {/* Quick info */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 30 }}>
          <div style={{ padding: 20, border: '1px solid #ebebeb', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6 }}>전화 상담</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0080ff' }}>1544-3800</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>평일 09:00 ~ 18:00</div>
          </div>
          <div style={{ padding: 20, border: '1px solid #ebebeb', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6 }}>카카오톡 상담</div>
            <div style={{ fontSize: 14, color: '#333' }}>@yes24</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>평일 09:00 ~ 18:00</div>
          </div>
          <div style={{ padding: 20, border: '1px solid #ebebeb', borderRadius: 4, textAlign: 'center' }}>
            <Link href="/Service/Help" style={{ textDecoration: 'none' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6 }}>1:1 문의</div>
              <div style={{ fontSize: 14, color: '#0080ff' }}>문의하기 →</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>24시간 접수 가능</div>
            </Link>
          </div>
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ebebeb', marginBottom: 20 }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => { setActiveCategory(cat.key); setExpandedId(null); }}
                style={{
                  padding: '10px 20px', fontSize: 13, border: 'none', cursor: 'pointer',
                  background: activeCategory === cat.key ? '#333' : 'transparent',
                  color: activeCategory === cat.key ? '#fff' : '#666',
                  fontWeight: activeCategory === cat.key ? 700 : 400,
                  borderRadius: activeCategory === cat.key ? '3px 3px 0 0' : 0,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {searchQuery && filteredFaq.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            "{searchQuery}"에 대한 검색 결과가 없습니다.
          </div>
        )}

        {/* FAQ Accordion */}
        <div style={{ marginBottom: 40 }}>
          {filteredFaq.map(faq => (
            <div key={faq.id} style={{ borderBottom: '1px solid #ebebeb' }}>
              <button
                onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                style={{
                  width: '100%', padding: '14px 12px', background: 'none', border: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#0080ff', fontWeight: 700, fontSize: 14 }}>Q</span>
                  <span style={{ fontSize: 13, color: '#333' }}>{faq.question}</span>
                </div>
                <span style={{ fontSize: 12, color: '#999', transform: expandedId === faq.id ? 'rotate(180deg)' : '', transition: 'transform 0.2s' }}>▼</span>
              </button>
              {expandedId === faq.id && (
                <div style={{ padding: '0 12px 16px 36px', fontSize: 13, color: '#555', lineHeight: 1.8 }}>
                  <div style={{ padding: '12px 16px', background: '#f8f8f8', borderRadius: 4, borderLeft: '3px solid #0080ff' }}>
                    <span style={{ color: '#0080ff', fontWeight: 700, marginRight: 8 }}>A</span>
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
