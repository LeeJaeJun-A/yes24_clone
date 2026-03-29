import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { getImageUrl } from '@/lib/constants';
import { getCoverUrl } from '@/lib/api';
import { CartItem } from '@/lib/types';

interface Props { items: CartItem[]; }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  try {
    const cookie = ctx.req.headers.cookie || '';
    const res = await fetch(`${process.env.API_INTERNAL_URL || 'http://backend:8000/api/v1'}/cart`, {
      headers: { Cookie: cookie },
    });
    if (res.ok) return { props: { items: await res.json() } };
  } catch {}
  return { redirect: { destination: '/Templates/FTLogin', permanent: false } };
};

export default function CheckoutPage({ items }: Props) {
  const router = useRouter();
  const [recipient, setRecipient] = useState('');
  const [phone, setPhone] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [memo, setMemo] = useState('');
  const [payMethod, setPayMethod] = useState('card');
  const [processing, setProcessing] = useState(false);

  const totalPrice = items.reduce((sum, item) => sum + (item.sale_price || 0) * item.quantity, 0);
  const deliveryFee = totalPrice >= 20000 ? 0 : 2500;
  const pointEarn = Math.floor(totalPrice * 0.05);

  const handleOrder = async () => {
    if (!recipient || !phone || !address1) {
      alert('배송지 정보를 입력해주세요.');
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch('/api/v1/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address_id: null }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/Order/Confirm?order_no=${data.order_no}`);
      } else {
        alert(data.detail || '주문 처리 중 오류가 발생했습니다.');
        setProcessing(false);
      }
    } catch {
      alert('주문 처리 중 오류가 발생했습니다.');
      setProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '80px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 14, marginBottom: 15 }}>주문할 상품이 없습니다.</p>
        <Link href="/Cart/Cart" className="btnC btn_blue b_size">카트로 이동</Link>
      </div>
    );
  }

  return (
    <>
      <Head><title>주문/결제 - YES24</title></Head>

      {/* Step breadcrumb */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0 10px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 0, marginBottom: 20 }}>
          {['장바구니', '주문/결제', '주문완료'].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: i === 1 ? '#0080ff' : '#d8d8d8',
                color: i === 1 ? '#fff' : '#999',
                fontSize: 12, fontWeight: 700, marginRight: 6,
              }}>{i + 1}</span>
              <span style={{ fontSize: 13, color: i === 1 ? '#333' : '#999', fontWeight: i === 1 ? 700 : 400 }}>{step}</span>
              {i < 2 && <span style={{ margin: '0 15px', color: '#d8d8d8' }}>→</span>}
            </div>
          ))}
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 25 }}>
          주문/결제
        </h1>

        <div style={{ display: 'flex', gap: 25 }}>
          {/* Left: Form */}
          <div style={{ flex: 1 }}>
            {/* 주문상품 */}
            <div style={{ marginBottom: 25 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', paddingBottom: 8, borderBottom: '1px solid #333', marginBottom: 12 }}>
                주문상품 ({items.length}건)
              </h3>
              {items.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #ebebeb', alignItems: 'center' }}>
                  <img src={getCoverUrl(item.cover_image, item.product_id || item.id)} alt="" style={{ width: 50, border: '1px solid #ebebeb' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>수량: {item.quantity}</div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#333', flexShrink: 0 }}>
                    {((item.sale_price || 0) * item.quantity).toLocaleString()}원
                  </div>
                </div>
              ))}
            </div>

            {/* 배송지 정보 */}
            <div style={{ marginBottom: 25 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', paddingBottom: 8, borderBottom: '1px solid #333', marginBottom: 12 }}>
                배송지 정보
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', width: 100, fontWeight: 500 }}>받는분 *</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>
                      <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="이름" style={{ width: 200, padding: '6px 10px', border: '1px solid #d8d8d8', fontSize: 13 }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>연락처 *</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" style={{ width: 200, padding: '6px 10px', border: '1px solid #d8d8d8', fontSize: 13 }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>우편번호 *</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="text" value={zipcode} onChange={(e) => setZipcode(e.target.value)} placeholder="우편번호" style={{ width: 100, padding: '6px 10px', border: '1px solid #d8d8d8', fontSize: 13 }} />
                        <button className="btnC m_size" onClick={() => setZipcode('06234')}>우편번호 찾기</button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>주소 *</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>
                      <input type="text" value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="기본주소" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d8d8d8', fontSize: 13, marginBottom: 6 }} />
                      <input type="text" value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="상세주소 (선택)" style={{ width: '100%', padding: '6px 10px', border: '1px solid #d8d8d8', fontSize: 13 }} />
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>배송 메모</td>
                    <td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>
                      <select value={memo} onChange={(e) => setMemo(e.target.value)} style={{ width: '100%', padding: '6px 10px', border: '1px solid #d8d8d8', fontSize: 13 }}>
                        <option value="">배송 시 요청사항을 선택하세요</option>
                        <option value="문 앞에 놓아주세요">문 앞에 놓아주세요</option>
                        <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
                        <option value="배송 전 연락 바랍니다">배송 전 연락 바랍니다</option>
                        <option value="부재 시 연락 바랍니다">부재 시 연락 바랍니다</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 결제수단 */}
            <div style={{ marginBottom: 25 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', paddingBottom: 8, borderBottom: '1px solid #333', marginBottom: 12 }}>
                결제수단
              </h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { value: 'card', label: '신용/체크카드' },
                  { value: 'bank', label: '무통장입금' },
                  { value: 'kakao', label: '카카오페이' },
                  { value: 'naver', label: '네이버페이' },
                  { value: 'toss', label: '토스' },
                ].map(pm => (
                  <button key={pm.value} onClick={() => setPayMethod(pm.value)}
                    style={{
                      padding: '10px 20px', border: '1px solid', fontSize: 13, cursor: 'pointer', borderRadius: 3,
                      borderColor: payMethod === pm.value ? '#0080ff' : '#d8d8d8',
                      background: payMethod === pm.value ? '#e5f2ff' : '#fff',
                      color: payMethod === pm.value ? '#0080ff' : '#333',
                      fontWeight: payMethod === pm.value ? 700 : 400,
                    }}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Summary */}
          <div style={{ width: 280, flexShrink: 0 }}>
            <div style={{ border: '2px solid #333', position: 'sticky', top: 20 }}>
              <div style={{ padding: 15, borderBottom: '1px solid #ebebeb', background: '#f8f8f8' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>결제금액</h3>
              </div>
              <div style={{ padding: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#666' }}>상품금액</span>
                  <span style={{ color: '#333' }}>{totalPrice.toLocaleString()}원</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#666' }}>배송비</span>
                  <span style={{ color: '#333' }}>{deliveryFee === 0 ? '무료' : `${deliveryFee.toLocaleString()}원`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                  <span style={{ color: '#666' }}>적립 예정</span>
                  <span style={{ color: '#0080ff' }}>{pointEarn.toLocaleString()}P</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: 15, borderTop: '1px solid #333',
                  fontSize: 18, fontWeight: 700,
                }}>
                  <span style={{ color: '#333' }}>총 결제금액</span>
                  <span style={{ color: '#ff6666' }}>{(totalPrice + deliveryFee).toLocaleString()}원</span>
                </div>
              </div>
              <div style={{ padding: '0 15px 15px' }}>
                <div style={{ marginBottom: 10, padding: '8px 0', textAlign: 'center' }}>
                  <label style={{ fontSize: 12, color: '#666', cursor: 'pointer' }}>
                    <input type="checkbox" style={{ marginRight: 6, width: 'auto', verticalAlign: 'middle' }} />
                    주문 내용을 확인하였으며, 결제에 동의합니다.
                  </label>
                </div>
                <button onClick={handleOrder} disabled={processing}
                  className="btnC btn_blue xb_size" style={{ width: '100%', fontWeight: 700 }}>
                  <span className="bWrap"><em className="txt">{processing ? '결제 처리 중...' : `${(totalPrice + deliveryFee).toLocaleString()}원 결제하기`}</em></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
