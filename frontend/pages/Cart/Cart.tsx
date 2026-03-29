import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { getImageUrl } from '@/lib/constants';
import { getCoverUrl } from '@/lib/api';
import { CartItem, Product } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import ProductCard from '@/components/common/ProductCard';

interface Props {
  initialItems: CartItem[];
  recommended: Product[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const cookie = ctx.req.headers.cookie || '';
  const base = process.env.API_INTERNAL_URL || 'http://backend:8000/api/v1';
  let initialItems: CartItem[] = [];
  let recommended: Product[] = [];
  try {
    const res = await fetch(`${base}/cart`, { headers: { Cookie: cookie } });
    if (res.ok) initialItems = await res.json();
  } catch {}
  try {
    const res = await fetch(`${base}/products/recommended?limit=4`);
    if (res.ok) recommended = await res.json();
  } catch {}
  return { props: { initialItems, recommended: Array.isArray(recommended) ? recommended : [] } };
};

interface CouponType {
  id: number; code: string; name: string; discount_type: string;
  discount_value: number; min_order_amount: number; max_discount: number | null;
  end_date: string; status: string;
}

export default function CartPage({ initialItems, recommended }: Props) {
  const router = useRouter();
  const { user, refreshCartCount } = useAuth();
  const [items, setItems] = useState(initialItems);
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set(initialItems.map(i => i.id)));

  // Coupon state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [coupons, setCoupons] = useState<CouponType[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponType | null>(null);

  // Points state
  const [usePoints, setUsePoints] = useState(0);

  const checkedItems = items.filter(i => checkedIds.has(i.id));
  const subtotal = checkedItems.reduce((sum, item) => sum + (item.sale_price || 0) * item.quantity, 0);
  const deliveryFee = subtotal >= 15000 ? 0 : subtotal > 0 ? 3000 : 0;
  const pointsEarned = Math.floor(subtotal * 0.05);

  // Calculate coupon discount
  let couponDiscount = 0;
  if (appliedCoupon && subtotal >= appliedCoupon.min_order_amount) {
    if (appliedCoupon.discount_type === 'PERCENT') {
      couponDiscount = Math.floor(subtotal * appliedCoupon.discount_value / 100);
      if (appliedCoupon.max_discount) couponDiscount = Math.min(couponDiscount, appliedCoupon.max_discount);
    } else {
      couponDiscount = appliedCoupon.discount_value;
    }
  }

  const totalPrice = Math.max(0, subtotal + deliveryFee - couponDiscount - usePoints);

  const toggleCheck = (itemId: number) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
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
    refreshCartCount();
  };

  const removeChecked = async () => {
    if (checkedIds.size === 0) { alert('삭제할 상품을 선택해주세요.'); return; }
    await Promise.all(Array.from(checkedIds).map(id => fetch(`/api/v1/cart/${id}`, { method: 'DELETE' })));
    setItems(items.filter(i => !checkedIds.has(i.id)));
    setCheckedIds(new Set());
    refreshCartCount();
  };

  const updateQuantity = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    try {
      await fetch(`/api/v1/cart/${itemId}?quantity=${newQty}`, { method: 'PUT' });
      setItems(items.map(i => i.id === itemId ? { ...i, quantity: newQty } : i));
    } catch { alert('수량 변경에 실패했습니다.'); }
  };

  const moveToWishlist = async (item: CartItem) => {
    try {
      await fetch(`/api/v1/wishlist?product_id=${item.product_id}`, { method: 'POST' });
      await fetch(`/api/v1/cart/${item.id}`, { method: 'DELETE' });
      setItems(items.filter(i => i.id !== item.id));
      setCheckedIds(prev => { const next = new Set(prev); next.delete(item.id); return next; });
      refreshCartCount();
      alert('위시리스트로 이동했습니다.');
    } catch { alert('로그인이 필요합니다.'); }
  };

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/v1/users/me/coupons');
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.filter((c: CouponType) => c.status === '사용가능'));
      }
    } catch {}
    setShowCouponModal(true);
  };

  const applyCoupon = (coupon: CouponType) => {
    if (subtotal < coupon.min_order_amount) {
      alert(`최소 주문금액 ${coupon.min_order_amount.toLocaleString()}원 이상이어야 합니다.`);
      return;
    }
    setAppliedCoupon(coupon);
    setShowCouponModal(false);
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
          <Link href="/">홈</Link>
          <span className="ico_arr">&gt;</span>
          <span style={{ color: '#333' }}>카트</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 20 }}>
          카트 <span style={{ fontSize: 14, color: '#0080ff', fontWeight: 400 }}>({items.length})</span>
        </h1>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, color: '#ddd', marginBottom: 16 }}>🛒</div>
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
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: 30 }}>
                      <input type="checkbox" checked={checkedIds.size === items.length && items.length > 0} onChange={e => toggleAll(e.target.checked)} style={{ width: 'auto' }} />
                    </th>
                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>상품정보</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: 80 }}>수량</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: 100 }}>금액</th>
                    <th style={{ padding: '10px 8px', textAlign: 'center', width: 100 }}>관리</th>
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
                          <img src={getCoverUrl(item.cover_image, item.product_id)} alt="" style={{ width: 55, border: '1px solid #ebebeb' }} />
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{item.title}</div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #d8d8d8' }}>
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} style={{ width: 24, height: 24, border: 'none', background: '#f8f8f8', cursor: 'pointer', fontSize: 12 }}>-</button>
                          <span style={{ width: 30, textAlign: 'center', fontSize: 12, fontWeight: 700 }}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} style={{ width: 24, height: 24, border: 'none', background: '#f8f8f8', cursor: 'pointer', fontSize: 12 }}>+</button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#ff6666', fontSize: 14 }}>
                        {((item.sale_price || 0) * item.quantity).toLocaleString()}원
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
                          <button className="btnC m_size" onClick={() => removeItem(item.id)} style={{ fontSize: 11, width: 80 }}>삭제</button>
                          <button className="btnC m_size" onClick={() => moveToWishlist(item)} style={{ fontSize: 11, width: 80 }}>나중에 구매</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: 15, display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btnC m_size" onClick={removeChecked}>선택 삭제</button>
                </div>
                <Link href="/main/default.aspx" style={{ fontSize: 12, color: '#666' }}>← 쇼핑 계속하기</Link>
              </div>
            </div>

            {/* Order summary */}
            <div style={{ width: 280, flexShrink: 0 }}>
              <div style={{ border: '1px solid #d8d8d8', background: '#f8f8f8', position: 'sticky', top: 60 }}>
                <div style={{ padding: 15, borderBottom: '1px solid #d8d8d8' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>주문 예상 금액</h3>
                </div>
                <div style={{ padding: 15 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: '#666' }}>상품금액 ({checkedIds.size}건)</span>
                    <span style={{ color: '#333' }}>{subtotal.toLocaleString()}원</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: '#666' }}>배송비</span>
                    <span style={{ color: '#333' }}>{deliveryFee === 0 ? '무료' : `${deliveryFee.toLocaleString()}원`}</span>
                  </div>

                  {/* Coupon */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12 }}>
                    <span style={{ color: '#666' }}>쿠폰 할인</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ color: couponDiscount > 0 ? '#ff6666' : '#333' }}>
                        {couponDiscount > 0 ? `-${couponDiscount.toLocaleString()}원` : '0원'}
                      </span>
                      <button onClick={fetchCoupons} style={{ fontSize: 10, padding: '2px 6px', border: '1px solid #d8d8d8', background: '#fff', cursor: 'pointer', borderRadius: 2 }}>
                        {appliedCoupon ? '변경' : '적용'}
                      </button>
                    </div>
                  </div>

                  {/* Points */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, fontSize: 12 }}>
                    <span style={{ color: '#666' }}>포인트 사용</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        value={usePoints}
                        onChange={e => {
                          const max = user?.point_balance || 0;
                          const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), max, subtotal);
                          setUsePoints(val);
                        }}
                        style={{ width: 70, padding: '2px 6px', border: '1px solid #d8d8d8', fontSize: 11, textAlign: 'right' }}
                      />
                      <span style={{ fontSize: 10, color: '#999' }}>원</span>
                    </div>
                  </div>
                  {user && (
                    <div style={{ fontSize: 10, color: '#999', textAlign: 'right', marginBottom: 12 }}>
                      보유 포인트: {user.point_balance.toLocaleString()}원
                      <button
                        onClick={() => setUsePoints(Math.min(user.point_balance, subtotal))}
                        style={{ marginLeft: 4, fontSize: 10, color: '#0080ff', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        전액사용
                      </button>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #d8d8d8', fontSize: 16, fontWeight: 700 }}>
                    <span style={{ color: '#333' }}>총 결제금액</span>
                    <span style={{ color: '#ff6666' }}>{totalPrice.toLocaleString()}원</span>
                  </div>

                  {subtotal > 0 && (
                    <div style={{ fontSize: 11, color: '#0080ff', marginTop: 8, textAlign: 'center' }}>
                      YES포인트 {pointsEarned.toLocaleString()}점 적립 예정
                    </div>
                  )}
                  {subtotal > 0 && subtotal < 15000 && (
                    <div style={{ fontSize: 11, color: '#ff6666', marginTop: 4, textAlign: 'center' }}>
                      {(15000 - subtotal).toLocaleString()}원 더 담으면 무료배송!
                    </div>
                  )}
                  {/* FIX 4: Delivery estimate in cart */}
                  <CartDeliveryEstimate />
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

        {/* Recommended products */}
        {recommended.length > 0 && (
          <div style={{ marginTop: 40, marginBottom: 40 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333', paddingBottom: 10, borderBottom: '2px solid #333', marginBottom: 20 }}>
              관련 추천상품
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {recommended.slice(0, 4).map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Coupon Modal */}
      {showCouponModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) setShowCouponModal(false); }}>
          <div style={{ background: '#fff', borderRadius: 8, width: 480, maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>쿠폰 적용</h3>
              <button onClick={() => setShowCouponModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 20 }}>
              {coupons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 30, color: '#999' }}>사용 가능한 쿠폰이 없습니다.</div>
              ) : (
                coupons.map(c => (
                  <div key={c.id} style={{
                    border: '1px solid #ebebeb', borderRadius: 4, padding: 16, marginBottom: 10,
                    borderLeft: appliedCoupon?.id === c.id ? '3px solid #0080ff' : '1px solid #ebebeb',
                    background: appliedCoupon?.id === c.id ? '#f0f7ff' : '#fff',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 4 }}>{c.name}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#ff6666' }}>
                          {c.discount_type === 'PERCENT' ? `${c.discount_value}% 할인` : `${c.discount_value.toLocaleString()}원 할인`}
                        </div>
                        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                          {c.min_order_amount > 0 && `${c.min_order_amount.toLocaleString()}원 이상 구매 시`}
                          {c.max_discount && ` (최대 ${c.max_discount.toLocaleString()}원)`}
                          {' | '}{c.end_date}까지
                        </div>
                      </div>
                      <button
                        onClick={() => applyCoupon(c)}
                        className={`btnC m_size ${appliedCoupon?.id === c.id ? '' : 'btn_blue'}`}
                        style={{ fontSize: 12 }}
                      >
                        {appliedCoupon?.id === c.id ? '적용됨' : '적용'}
                      </button>
                    </div>
                  </div>
                ))
              )}
              {appliedCoupon && (
                <button
                  onClick={() => { setAppliedCoupon(null); setShowCouponModal(false); }}
                  className="btnC m_size"
                  style={{ width: '100%', marginTop: 10, fontSize: 12 }}
                >
                  쿠폰 적용 취소
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CartDeliveryEstimate() {
  const [info, setInfo] = useState<{ message: string; dateStr: string } | null>(null);
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const cutoff = 14;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    let d = new Date(now);
    if (hour < cutoff) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      setInfo({ message: `오늘 오후 ${cutoff}시 이전 주문 시`, dateStr: `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]}) 도착 예정` });
    } else {
      d.setDate(d.getDate() + 2);
      if (d.getDay() === 0) d.setDate(d.getDate() + 1);
      setInfo({ message: `내일 오후 ${cutoff}시 이전 주문 시`, dateStr: `${d.getMonth() + 1}월 ${d.getDate()}일(${days[d.getDay()]}) 도착 예정` });
    }
  }, []);
  if (!info) return null;
  return (
    <div style={{ fontSize: 11, color: '#555', marginTop: 10, padding: '6px 10px', background: '#f0f7ff', borderRadius: 3, borderLeft: '3px solid #0080ff' }}>
      <span style={{ color: '#0080ff', fontWeight: 600 }}>결제 시 배송 예정일</span>{' '}
      {info.message} <strong style={{ color: '#333' }}>{info.dateStr}</strong>
    </div>
  );
}
