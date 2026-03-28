import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { getImageUrl } from '@/lib/constants';
import { CartItem } from '@/lib/types';

interface Props { initialItems: CartItem[]; }

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  try {
    const cookie = ctx.req.headers.cookie || '';
    const res = await fetch(`${process.env.API_INTERNAL_URL || 'http://backend:8000/api/v1'}/cart`, {
      headers: { Cookie: cookie },
    });
    if (res.ok) return { props: { initialItems: await res.json() } };
  } catch {}
  return { props: { initialItems: [] } };
};

export default function CartPage({ initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set(initialItems.map(i => i.id)));
  const totalPrice = items.reduce((sum, item) => sum + (item.sale_price || 0) * item.quantity, 0);
  const deliveryFee = totalPrice >= 20000 ? 0 : 2500;

  const toggleCheck = (itemId: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) setCheckedIds(new Set(items.map(i => i.id)));
    else setCheckedIds(new Set());
  };

  const removeItem = async (itemId: number) => {
    await fetch(`/api/v1/cart/${itemId}`, { method: 'DELETE' });
    setItems(items.filter(i => i.id !== itemId));
    setCheckedIds(prev => { const next = new Set(prev); next.delete(itemId); return next; });
  };

  const removeChecked = async () => {
    if (checkedIds.size === 0) { alert('삭제할 상품을 선택해주세요.'); return; }
    await Promise.all(Array.from(checkedIds).map(id => fetch(`/api/v1/cart/${id}`, { method: 'DELETE' })));
    setItems(items.filter(i => !checkedIds.has(i.id)));
    setCheckedIds(new Set());
  };

  const removeAll = async () => {
    if (items.length === 0) return;
    if (!confirm('카트를 비우시겠습니까?')) return;
    await Promise.all(items.map(i => fetch(`/api/v1/cart/${i.id}`, { method: 'DELETE' })));
    setItems([]);
    setCheckedIds(new Set());
  };

  const updateQuantity = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      await fetch(`/api/v1/cart/${itemId}?quantity=${newQty}`, { method: 'PUT' });
      setItems(items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    } catch { alert('수량 변경에 실패했습니다.'); }
  };

  const placeOrder = async (selectedOnly: boolean) => {
    const orderItems = selectedOnly ? items.filter(i => checkedIds.has(i.id)) : items;
    if (orderItems.length === 0) { alert('주문할 상품을 선택해주세요.'); return; }
    try {
      const res = await fetch('/api/v1/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_ids: orderItems.map(i => i.id) }),
      });
      const data = await res.json();
      router.push(`/Order/Confirm?order_no=${data.order_no}`);
    } catch { alert('로그인이 필요합니다.'); }
  };

  return (
    <>
      <Head><title>카트 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span style={{ color: '#333' }}>카트</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 20 }}>
          카트
        </h1>

        <div className="aspnet-hidden">
          <input type="hidden" name="__VIEWSTATE" value="/wEPDwULLTE2MTY2ODcyMjk=" />
          <input type="hidden" name="__EVENTVALIDATION" value="/wEdAAQ=" />
        </div>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 15 }}>카트에 담긴 상품이 없습니다.</p>
            <Link href="/main/default.aspx" className="btnC btn_blue b_size">쇼핑 계속하기</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 25 }}>
            {/* Cart items */}
            <div style={{ flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #333', background: '#f8f8f8' }}>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: 30 }}>
                      <input type="checkbox" checked={checkedIds.size === items.length && items.length > 0} onChange={(e) => toggleAll(e.target.checked)} style={{ width: 'auto' }} />
                    </th>
                    <th style={{ padding: '10px 12px', textAlign: 'left' }}>상품정보</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: 70 }}>수량</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: 100 }}>금액</th>
                    <th style={{ padding: '10px 12px', textAlign: 'center', width: 50 }}>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #ebebeb' }}>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <input type="checkbox" checked={checkedIds.has(item.id)} onChange={() => toggleCheck(item.id)} style={{ width: 'auto' }} />
                      </td>
                      <td style={{ padding: 12 }}>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <img src={getImageUrl(item.cover_image)} alt="" style={{ width: 55, border: '1px solid #ebebeb' }} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{item.title}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #d8d8d8' }}>
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: 22, height: 22, border: 'none', background: '#f8f8f8', cursor: 'pointer', fontSize: 12 }}>-</button>
                          <span style={{ width: 30, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 22, height: 22, border: 'none', background: '#f8f8f8', cursor: 'pointer', fontSize: 12 }}>+</button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#ff6666', fontSize: 14 }}>
                        {((item.sale_price || 0) * item.quantity).toLocaleString()}원
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="btnC m_size" onClick={() => removeItem(item.id)} style={{ fontSize: 11 }}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Bottom actions */}
              <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btnC m_size" onClick={removeChecked}>선택 삭제</button>
                  <button className="btnC m_size" onClick={removeAll}>전체 삭제</button>
                </div>
                <Link href="/main/default.aspx" style={{ fontSize: 12, color: '#666' }}>← 쇼핑 계속하기</Link>
              </div>
            </div>

            {/* Order summary */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <div style={{ border: '1px solid #d8d8d8', background: '#f8f8f8' }}>
                <div style={{ padding: 15, borderBottom: '1px solid #d8d8d8' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>주문 예상 금액</h3>
                </div>
                <div style={{ padding: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: '#666' }}>상품금액</span>
                    <span style={{ color: '#333' }}>{totalPrice.toLocaleString()}원</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: '#666' }}>배송비</span>
                    <span style={{ color: '#333' }}>{deliveryFee === 0 ? '무료' : `${deliveryFee.toLocaleString()}원`}</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    paddingTop: 12, borderTop: '1px solid #d8d8d8',
                    fontSize: 16, fontWeight: 700,
                  }}>
                    <span style={{ color: '#333' }}>총 결제금액</span>
                    <span style={{ color: '#ff6666' }}>{(totalPrice + deliveryFee).toLocaleString()}원</span>
                  </div>
                </div>
                <div style={{ padding: '0 15px 15px' }}>
                  <button className="btnC btn_blue xb_size" style={{ width: '100%', marginBottom: 6 }} onClick={() => placeOrder(false)}>
                    <span className="bWrap"><em className="txt">주문하기</em></span>
                  </button>
                  <button className="btnC b_size" style={{ width: '100%' }} onClick={() => placeOrder(true)}>
                    <span className="bWrap"><em className="txt">선택 주문</em></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
