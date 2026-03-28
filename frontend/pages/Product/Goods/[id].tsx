import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, Review, PaginatedResponse } from '@/lib/types';
import { getImageUrl } from '@/lib/constants';
import ProductCard from '@/components/common/ProductCard';

interface Props {
  product: Product | null;
  reviews: PaginatedResponse<Review>;
  related: Product[];
  categoryBest: Product[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = ctx.params?.id as string;
  const emptyReviews = { items: [], total: 0, page: 1, size: 10, pages: 0 };

  // Fetch product first - this is required
  let product: Product | null = null;
  try {
    product = await apiFetch<Product>(`/products/${id}`, { isServer: true });
  } catch {
    return { props: { product: null, reviews: emptyReviews, related: [], categoryBest: [] } };
  }

  // Fetch supplementary data - failures are non-fatal
  const [reviews, related, categoryBest] = await Promise.all([
    apiFetch<PaginatedResponse<Review>>(`/products/${id}/reviews?page=1&size=10`, { isServer: true }).catch(() => emptyReviews),
    apiFetch<Product[]>('/products/recommended?limit=6', { isServer: true }).catch(() => []),
    apiFetch<any>('/products/bestseller?size=5', { isServer: true }).then(r => r.items || []).catch(() => []),
  ]);

  return { props: { product, reviews, related, categoryBest } };
};

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  const full = Math.round(Number(rating));
  return (
    <span style={{ color: '#ffb800', fontSize: size, letterSpacing: -1 }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  );
}

export default function ProductDetail({ product, reviews, related, categoryBest }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('info');
  const [quantity, setQuantity] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewItems, setReviewItems] = useState(reviews.items);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  if (!product) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '80px 0', textAlign: 'center' }}>
        <h2 style={{ fontSize: 18, marginBottom: 10 }}>상품을 찾을 수 없습니다</h2>
        <p style={{ color: '#999', marginBottom: 20 }}>요청하신 상품이 존재하지 않거나 판매 종료되었습니다.</p>
        <Link href="/" className="btnC btn_blue b_size">홈으로 이동</Link>
      </div>
    );
  }

  const pointEarn = Math.floor(product.sale_price * (product.point_rate || 5) / 100);

  const addToCart = async () => {
    try {
      await fetch('/api/v1/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, quantity }),
      });
      alert('카트에 담았습니다.');
    } catch { alert('로그인이 필요합니다.'); }
  };

  const addToWishlist = async () => {
    try {
      await fetch(`/api/v1/wishlist?product_id=${product.id}`, { method: 'POST' });
      alert('위시리스트에 추가되었습니다.');
    } catch { alert('로그인이 필요합니다.'); }
  };

  const directOrder = async () => {
    try {
      const res = await fetch('/api/v1/checkout/direct-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goods_no: product.goods_no, quantity }),
      });
      const data = await res.json();
      router.push(`/Order/Confirm?order_no=${data.order_no}`);
    } catch { alert('로그인이 필요합니다.'); }
  };

  const shareUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('URL이 복사되었습니다.');
  };

  const submitReview = async () => {
    if (!reviewContent.trim()) { alert('리뷰 내용을 입력해주세요.'); return; }
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/v1/products/${product.goods_no}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, content: reviewContent }),
      });
      const newReview = await res.json();
      setReviewItems([newReview, ...reviewItems]);
      setReviewContent('');
      setReviewRating(5);
      alert('리뷰가 등록되었습니다.');
    } catch { alert('로그인이 필요합니다.'); }
    setReviewSubmitting(false);
  };

  const loadMoreReviews = async () => {
    const nextPage = reviewPage + 1;
    try {
      const res = await fetch(`/api/v1/products/${product.goods_no}/reviews?page=${nextPage}&size=10`);
      const data = await res.json();
      setReviewItems([...reviewItems, ...data.items]);
      setReviewPage(nextPage);
    } catch {}
  };

  return (
    <>
      <Head>
        <title>{product.title} - YES24</title>
        <meta property="og:title" content={product.title} />
        <meta property="og:description" content={product.description?.slice(0, 200)} />
      </Head>

      {/* Breadcrumb */}
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          {product.category_code && (
            <>
              <Link href={`/Product/Category/Display/${product.category_code.slice(0, 3)}`}>
                국내도서
              </Link>
              <span className="ico_arr">&gt;</span>
            </>
          )}
          <span style={{ color: '#333' }}>{product.title.slice(0, 30)}</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
        {/* Hidden ASP.NET fields */}
        <div className="aspnet-hidden">
          <input type="hidden" name="__VIEWSTATE" value="/wEPDwULLTE2MTY2ODcyMjkPFgI=" />
          <input type="hidden" name="__EVENTTARGET" value="" />
          <input type="hidden" name="__EVENTARGUMENT" value="" />
          <input type="hidden" name="goodsNo" value={String(product.goods_no)} />
        </div>

        {/* Top Section: Image + Info */}
        <div id="yDetailTopWrap" style={{ display: 'flex', gap: 30, paddingTop: 20, marginBottom: 30 }}>
          {/* Left: Product Image */}
          <div style={{ width: 250, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ display: 'block', border: '1px solid #ebebeb' }}>
                <img src={getImageUrl(product.cover_image)} alt={product.title} style={{ width: '100%', display: 'block' }} />
              </span>
              {product.discount_rate > 0 && (
                <span style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'linear-gradient(135deg, #0080ff 0%, #0043ff 100%)',
                  color: '#fff', padding: '6px 10px', borderRadius: 3,
                  fontSize: 14, fontWeight: 700,
                }}>
                  {product.discount_rate}%
                </span>
              )}
            </div>
            {/* Share button */}
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <button className="btnC m_size" style={{ flex: 1 }} onClick={shareUrl}>공유하기</button>
            </div>
          </div>

          {/* Right: Product Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <div style={{ marginBottom: 8 }}>
              <span className="iconC accent"><em className="txt">소득공제</em></span>
              {!product.is_available && <span className="iconC" style={{ background: '#fff3e5', color: '#e67e22', marginLeft: 4 }}><em className="txt">품절</em></span>}
            </div>

            {/* Title */}
            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#333', lineHeight: 1.4, marginBottom: 8 }}>
              {product.title}
            </h2>
            {product.subtitle && (
              <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>{product.subtitle}</p>
            )}

            {/* Author / Publisher / Date */}
            <div style={{ fontSize: 13, color: '#666', marginBottom: 15, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <span><a href="#" style={{ color: '#0080ff' }}>{product.author}</a> 저</span>
              {product.translator && (
                <><span className="divi" style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', margin: '0 8px', verticalAlign: 'middle' }} /><span>{product.translator} 역</span></>
              )}
              <span className="divi" style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', margin: '0 8px', verticalAlign: 'middle' }} />
              <span><a href="#" style={{ color: '#0080ff' }}>{product.publisher}</a></span>
              {product.publish_date && (
                <><span className="divi" style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', margin: '0 8px', verticalAlign: 'middle' }} /><span>{product.publish_date}</span></>
              )}
            </div>

            {/* Rating */}
            {product.review_count > 0 && (
              <div style={{ marginBottom: 15, paddingBottom: 15, borderBottom: '1px solid #d8d8d8' }}>
                <Stars rating={Number(product.rating_avg)} size={14} />
                <span style={{ marginLeft: 6, fontSize: 16, fontWeight: 700, color: '#333' }}>
                  {Number(product.rating_avg).toFixed(1)}
                </span>
                <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
                  ({product.review_count.toLocaleString()}개 리뷰)
                </span>
                <span style={{ fontSize: 12, color: '#999', marginLeft: 15 }}>
                  판매지수 {product.sales_index.toLocaleString()}
                </span>
              </div>
            )}

            {/* Price Box */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <tbody>
                <tr>
                  <td style={{ width: 80, padding: '6px 0', fontSize: 12, color: '#999', verticalAlign: 'top' }}>정가</td>
                  <td style={{ padding: '6px 0', fontSize: 13 }}>{product.original_price.toLocaleString()}원</td>
                </tr>
                <tr style={{ color: '#ff6666' }}>
                  <td style={{ width: 80, padding: '6px 0', fontSize: 12, verticalAlign: 'middle' }}>
                    <strong>판매가</strong>
                  </td>
                  <td style={{ padding: '6px 0' }}>
                    <strong style={{ fontSize: 24, fontWeight: 700 }}>
                      {product.sale_price.toLocaleString()}
                    </strong>
                    <span style={{ fontSize: 14, marginLeft: 2 }}>원</span>
                    {product.discount_rate > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 700 }}>
                        [{product.discount_rate}% 할인]
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td style={{ width: 80, padding: '6px 0', fontSize: 12, color: '#999' }}>YES포인트</td>
                  <td style={{ padding: '6px 0', fontSize: 13 }}>
                    {pointEarn.toLocaleString()}원 ({product.point_rate || 5}% 적립)
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Delivery info */}
            <div style={{ padding: '12px 15px', background: '#f8f8f8', borderRadius: 3, marginBottom: 15, fontSize: 12, color: '#666' }}>
              <span style={{ fontWeight: 700, color: '#333', marginRight: 8 }}>배송안내</span>
              오후 2시 전 주문 시 당일 출고 (주말, 공휴일 제외) | 무료배송
            </div>

            {/* Quantity selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
              <span style={{ fontSize: 12, color: '#999', width: 80 }}>수량</span>
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #d8d8d8' }}>
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{
                  width: 28, height: 28, border: 'none', background: '#f8f8f8',
                  cursor: 'pointer', fontSize: 14,
                }}>-</button>
                <span style={{ width: 40, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} style={{
                  width: 28, height: 28, border: 'none', background: '#f8f8f8',
                  cursor: 'pointer', fontSize: 14,
                }}>+</button>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 'auto' }}>
                총 금액: <span style={{ color: '#ff6666', fontSize: 18 }}>{(product.sale_price * quantity).toLocaleString()}</span>원
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={addToCart} className="btnC btn_blue xb_size" style={{ flex: 1, fontWeight: 700 }}>
                <span className="bWrap"><em className="txt">카트에 넣기</em></span>
              </button>
              <button onClick={directOrder} className="btnC btn_sBlue xb_size" style={{ flex: 1, fontWeight: 700 }}>
                <span className="bWrap"><em className="txt">바로구매</em></span>
              </button>
              <button className="btnC xb_size" title="위시리스트" onClick={addToWishlist} style={{ padding: '12px 14px' }}>위시</button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div id="yDetailTabNavWrap" style={{
          position: 'sticky', top: 0, zIndex: 100, background: '#fff',
          borderBottom: '1px solid #333', marginBottom: 0,
        }}>
          <div style={{ display: 'flex' }}>
            {[
              { key: 'info', label: '도서정보' },
              { key: 'toc', label: '목차' },
              { key: 'reviews', label: `회원리뷰 (${product.review_count})` },
              { key: 'shipping', label: '배송/반품/교환' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, minHeight: 50, padding: '12px 8px', border: '1px solid #d8d8d8',
                  borderBottom: activeTab === tab.key ? '2px solid #fff' : '1px solid #333',
                  marginBottom: -1,
                  background: activeTab === tab.key ? '#fff' : '#f8f8f8',
                  color: activeTab === tab.key ? '#0080ff' : '#333',
                  fontWeight: activeTab === tab.key ? 700 : 500,
                  fontSize: 14, cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content + Sidebar */}
        <div style={{ display: 'flex', gap: 30, marginTop: 30 }}>
          {/* Main content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeTab === 'info' && (
              <div>
                {/* Specs table */}
                <div style={{ marginBottom: 30 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                    기본정보
                  </h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      {product.isbn && <tr><td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', width: 100, fontWeight: 500 }}>ISBN</td><td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>{product.isbn}</td></tr>}
                      {product.page_count && <tr><td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>쪽수</td><td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>{product.page_count}쪽</td></tr>}
                      {product.dimensions && <tr><td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>크기</td><td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>{product.dimensions}</td></tr>}
                      {product.weight_grams && <tr><td style={{ padding: '8px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>무게</td><td style={{ padding: '8px 12px', border: '1px solid #ebebeb' }}>{product.weight_grams}g</td></tr>}
                    </tbody>
                  </table>
                </div>

                {/* Description */}
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                    책 소개
                  </h3>
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: '#555' }}>
                    {product.description || '상품 설명이 준비 중입니다.'}
                  </div>
                </div>

                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    {product.tags.map((tag, i) => (
                      <span key={i} className="tag"><a>#{tag}</a></span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'toc' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                  목차
                </h3>
                <div style={{ fontSize: 13, lineHeight: 2, color: '#555', whiteSpace: 'pre-line' }}>
                  {product.toc || '목차 정보가 없습니다.'}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                  회원 리뷰 <span style={{ color: '#0080ff' }}>({product.review_count}건)</span>
                </h3>

                {/* Rating summary */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 20, background: '#f8f8f8', marginBottom: 20, borderRadius: 3 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#333' }}>{Number(product.rating_avg).toFixed(1)}</div>
                    <Stars rating={Number(product.rating_avg)} size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = reviewItems.filter(r => r.rating === star).length;
                      const pct = reviewItems.length > 0 ? (count / reviewItems.length * 100) : 0;
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, color: '#999', width: 30 }}>{star}점</span>
                          <div style={{ flex: 1, height: 8, background: '#eee', borderRadius: 4 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#ffb800', borderRadius: 4 }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#999', width: 30 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review list */}
                {reviewItems.map(review => (
                  <div key={review.id} style={{ padding: '15px 0', borderBottom: '1px solid #ebebeb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <Stars rating={review.rating} />
                        <span style={{ marginLeft: 6, fontWeight: 700, fontSize: 12, color: '#333' }}>
                          {review.username || `회원${review.user_id}`}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#999' }}>
                        {review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : ''}
                      </span>
                    </div>
                    {review.title && <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 5, color: '#333' }}>{review.title}</div>}
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: '#555' }}>{review.content}</div>
                    <div style={{ marginTop: 8, fontSize: 11, color: '#999' }}>
                      추천 {review.likes}
                    </div>
                  </div>
                ))}
                {/* Review submission form */}
                <div style={{ padding: 20, background: '#f8f8f8', borderRadius: 3, marginTop: 20, marginBottom: 20, border: '1px solid #ebebeb' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>리뷰 작성</h4>
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>평점</span>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setReviewRating(star)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: star <= reviewRating ? '#ffb800' : '#ddd' }}
                      >
                        {star <= reviewRating ? '\u2605' : '\u2606'}
                      </button>
                    ))}
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 6 }}>{reviewRating}점</span>
                  </div>
                  <textarea
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    placeholder="리뷰 내용을 입력해 주세요."
                    style={{ width: '100%', height: 80, padding: 10, border: '1px solid #d8d8d8', borderRadius: 3, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <div style={{ textAlign: 'right', marginTop: 8 }}>
                    <button className="btnC btn_blue m_size" onClick={submitReview} disabled={reviewSubmitting} style={{ fontSize: 12 }}>
                      {reviewSubmitting ? '등록 중...' : '리뷰 등록'}
                    </button>
                  </div>
                </div>

                {reviewItems.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                    아직 작성된 리뷰가 없습니다.
                  </div>
                )}
                {reviewItems.length < product.review_count && (
                  <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <button className="btnC b_size" onClick={loadMoreReviews}>리뷰 더보기</button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'shipping' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                  배송/반품/교환 안내
                </h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <tbody>
                    <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', width: 100, fontWeight: 500 }}>배송비</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>무료 (2만원 이상) / 2,500원 (2만원 미만)</td></tr>
                    <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>배송기간</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>평일 기준 1~2일 이내 출고</td></tr>
                    <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>반품기한</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>수령일로부터 10일 이내</td></tr>
                    <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>반품배송비</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>편도 2,500원 (고객 귀책 시)</td></tr>
                    <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500 }}>교환기한</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>수령일로부터 10일 이내</td></tr>
                  </tbody>
                </table>
                <div style={{ marginTop: 20, fontSize: 12, color: '#666', lineHeight: 1.8 }}>
                  <h4 style={{ color: '#333', marginBottom: 8, fontSize: 13 }}>반품/교환 불가 사유</h4>
                  <ul style={{ paddingLeft: 16, listStyle: 'disc' }}>
                    <li>소비자의 책임 있는 사유로 상품이 훼손된 경우</li>
                    <li>포장을 개봉하였거나 포장이 훼손되어 상품가치가 감소한 경우</li>
                    <li>소비자의 사용에 의해 상품 등의 가치가 감소한 경우</li>
                    <li>시간의 경과에 의해 재판매가 곤란한 정도로 가치가 감소한 경우</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ width: 200, flexShrink: 0 }}>
            {/* Category Bestseller */}
            <div style={{ marginBottom: 30 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', paddingBottom: 8, borderBottom: '2px solid #333', marginBottom: 10 }}>
                이 분야 베스트
              </h4>
              {categoryBest.map((p, i) => (
                <div key={p.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: i < 3 ? '#0080ff' : '#999', width: 20, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/Product/Goods/${p.goods_no}`} style={{ fontSize: 12, color: '#333', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.title}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Related Products */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', paddingBottom: 8, borderBottom: '2px solid #333', marginBottom: 10 }}>
                추천 도서
              </h4>
              {related.slice(0, 3).map(p => (
                <div key={p.id} style={{ marginBottom: 15, display: 'flex', gap: 8 }}>
                  <Link href={`/Product/Goods/${p.goods_no}`}>
                    <img src={getImageUrl(p.cover_image)} alt={p.title} style={{ width: 55, border: '1px solid #ebebeb' }} loading="lazy" />
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/Product/Goods/${p.goods_no}`} style={{ fontSize: 12, color: '#333', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4 }}>
                      {p.title}
                    </Link>
                    <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4 }}>
                      <span style={{ color: '#ff6666' }}>{p.sale_price.toLocaleString()}</span>원
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
