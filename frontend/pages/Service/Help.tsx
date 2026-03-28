import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';

interface FaqItem {
  id: number;
  category: string;
  question: string;
  answer: string;
}

interface Props {
  faqs: FaqItem[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const faqs = await apiFetch<FaqItem[]>('/customer/faq', { isServer: true });
    return { props: { faqs: Array.isArray(faqs) ? faqs : [] } };
  } catch {
    return { props: { faqs: [] } };
  }
};

const DEFAULT_CATEGORIES = ['주문/결제', '배송', '반품/교환', '회원정보', '포인트/쿠폰', '기타'];

export default function HelpPage({ faqs }: Props) {
  const categories = faqs.length > 0
    ? [...new Set(faqs.map(f => f.category))]
    : DEFAULT_CATEGORIES;

  const [activeCategory, setActiveCategory] = useState(categories[0] || '');
  const [openId, setOpenId] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', content: '', email: '' });
  const [submitting, setSubmitting] = useState(false);

  const filteredFaqs = faqs.filter(f => f.category === activeCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      alert('제목과 내용을 입력해주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch('/customer/inquiry', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      alert('문의가 접수되었습니다.');
      setForm({ title: '', content: '', email: '' });
    } catch {
      alert('문의 접수에 실패했습니다. 로그인 후 이용해주세요.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head><title>고객센터 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>고객센터</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          고객센터
        </h2>

        {/* Contact Info */}
        <div style={{
          display: 'flex', gap: 20, marginBottom: 30,
        }}>
          <div style={{
            flex: 1, background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 4,
            padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8 }}>전화 상담</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0080ff', marginBottom: 6 }}>1544-3800</div>
            <div style={{ fontSize: 11, color: '#999' }}>평일 09:00 ~ 18:00 (점심 12:00 ~ 13:00)</div>
          </div>
          <div style={{
            flex: 1, background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 4,
            padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8 }}>이메일 상담</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0080ff', marginBottom: 6 }}>help@yes24.com</div>
            <div style={{ fontSize: 11, color: '#999' }}>24시간 접수 가능 (답변: 영업일 기준 1~2일)</div>
          </div>
          <div style={{
            flex: 1, background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 4,
            padding: '20px 24px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 8 }}>운영 시간</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6 }}>평일 09:00 ~ 18:00</div>
            <div style={{ fontSize: 11, color: '#999' }}>주말/공휴일 휴무</div>
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #333' }}>
            자주 묻는 질문 (FAQ)
          </h3>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #ebebeb' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setOpenId(null); }}
                style={{
                  padding: '8px 16px', fontSize: 12, border: 'none', cursor: 'pointer',
                  borderBottom: activeCategory === cat ? '2px solid #0080ff' : '2px solid transparent',
                  color: activeCategory === cat ? '#0080ff' : '#666',
                  fontWeight: activeCategory === cat ? 700 : 400,
                  background: 'transparent',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* FAQ accordion */}
          {filteredFaqs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>
              해당 카테고리에 등록된 FAQ가 없습니다.
            </div>
          ) : (
            <div>
              {filteredFaqs.map(faq => (
                <div key={faq.id} style={{ borderBottom: '1px solid #ebebeb' }}>
                  <button
                    onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                    style={{
                      width: '100%', padding: '14px 16px', textAlign: 'left',
                      fontSize: 13, color: '#333', background: openId === faq.id ? '#f8f8f8' : '#fff',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <span>
                      <span style={{ color: '#0080ff', fontWeight: 700, marginRight: 8 }}>Q.</span>
                      {faq.question}
                    </span>
                    <svg
                      width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#999" strokeWidth="1.5"
                      style={{ transform: openId === faq.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
                    >
                      <path d="M2 4l4 4 4-4" />
                    </svg>
                  </button>
                  {openId === faq.id && (
                    <div style={{
                      padding: '14px 16px 14px 36px',
                      fontSize: 13, color: '#666', lineHeight: 1.7,
                      background: '#fafafa',
                    }}>
                      <span style={{ color: '#ff6666', fontWeight: 700, marginRight: 8 }}>A.</span>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inquiry form */}
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid #333' }}>
            1:1 문의
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#333', marginBottom: 4, fontWeight: 600 }}>이메일</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="답변 받을 이메일 주소"
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 12, border: '1px solid #ccc',
                  borderRadius: 2, boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#333', marginBottom: 4, fontWeight: 600 }}>제목</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="문의 제목을 입력해주세요"
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 12, border: '1px solid #ccc',
                  borderRadius: 2, boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#333', marginBottom: 4, fontWeight: 600 }}>내용</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="문의 내용을 입력해주세요"
                rows={6}
                style={{
                  width: '100%', padding: '8px 12px', fontSize: 12, border: '1px solid #ccc',
                  borderRadius: 2, resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                disabled={submitting}
                className="btnC btn_blue"
                style={{
                  padding: '10px 40px', fontSize: 13, color: '#fff', background: '#0080ff',
                  border: 'none', borderRadius: 2, cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting ? '접수중...' : '문의 접수'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
