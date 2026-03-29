import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, Review, QnA, PaginatedResponse } from '@/lib/types';
import { getImageUrl } from '@/lib/constants';
import { getCoverUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Props {
  product: Product | null;
  reviews: PaginatedResponse<Review> & { meta?: any };
  qna: PaginatedResponse<QnA>;
  related: Product[];
  categoryBest: Product[];
  sameAuthor: Product[];
  samePublisher: Product[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const id = ctx.params?.id as string;
  const emptyReviews = { items: [], total: 0, page: 1, size: 10, pages: 0 };
  const emptyQna = { items: [], total: 0, page: 1, size: 10, pages: 0 };

  let product: Product | null = null;
  try {
    product = await apiFetch<Product>(`/products/${id}`, { isServer: true });
  } catch {
    return { props: { product: null, reviews: emptyReviews, qna: emptyQna, related: [], categoryBest: [], sameAuthor: [], samePublisher: [] } };
  }

  const [reviews, qna, related, categoryBest, sameAuthor, samePublisher] = await Promise.all([
    apiFetch<PaginatedResponse<Review>>(`/products/${id}/reviews?page=1&size=10&sort=newest`, { isServer: true }).catch(() => emptyReviews),
    apiFetch<PaginatedResponse<QnA>>(`/products/${id}/qna?page=1&size=10`, { isServer: true }).catch(() => emptyQna),
    apiFetch<Product[]>('/products/recommended?limit=6', { isServer: true }).catch(() => []),
    apiFetch<any>('/products/bestseller?size=5', { isServer: true }).then(r => r.items || []).catch(() => []),
    apiFetch<any>(`/products/by-author?author=${encodeURIComponent(product.author)}&size=8`, { isServer: true }).then(r => Array.isArray(r) ? r : (r.items || [])).catch(() => []),
    apiFetch<any>(`/products/by-publisher?publisher=${encodeURIComponent(product.publisher)}&size=8`, { isServer: true }).then(r => Array.isArray(r) ? r : (r.items || [])).catch(() => []),
  ]);

  return { props: { product, reviews, qna, related, categoryBest, sameAuthor, samePublisher } };
};

function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  const full = Math.round(Number(rating));
  return (
    <span style={{ color: '#ffb800', fontSize: size, letterSpacing: -1 }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  );
}

function maskUsername(name?: string) {
  if (!name || name.length < 2) return '***';
  return name[0] + '*'.repeat(Math.max(1, name.length - 2)) + name[name.length - 1];
}

function RelatedCarousel({ title, products }: { title: string; products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 300, behavior: 'smooth' });
    }
  };

  if (products.length === 0) return null;

  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: '2px solid #333', marginBottom: 15 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333' }}>{title}</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => scroll(-1)} className="btnC" style={{ width: 28, height: 28, padding: 0, fontSize: 14 }}>‹</button>
          <button onClick={() => scroll(1)} className="btnC" style={{ width: 28, height: 28, padding: 0, fontSize: 14 }}>›</button>
        </div>
      </div>
      <div
        ref={scrollRef}
        style={{
          display: 'flex', gap: 16, overflowX: 'auto', scrollBehavior: 'smooth',
          paddingBottom: 10, scrollbarWidth: 'none',
        }}
      >
        {products.slice(0, 8).map(p => (
          <Link key={p.id} href={`/Product/Goods/${p.goods_no}`} style={{ flexShrink: 0, width: 140, textDecoration: 'none', color: 'inherit' }}>
            <div style={{ border: '1px solid #ebebeb', borderRadius: 4, overflow: 'hidden' }}>
              <img src={getCoverUrl(p.cover_image, p.goods_no)} alt={p.title} style={{ width: '100%', display: 'block' }} loading="lazy" />
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontSize: 12, color: '#333', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                  {p.title}
                </div>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.author}
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#333' }}>
                  {p.sale_price.toLocaleString()}원
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ProductDetail({ product, reviews, qna, related, categoryBest, sameAuthor: sameAuthorRaw, samePublisher: samePublisherRaw }: Props) {
  const sameAuthor = Array.isArray(sameAuthorRaw) ? sameAuthorRaw : [];
  const samePublisher = Array.isArray(samePublisherRaw) ? samePublisherRaw : [];
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('info');
  const [quantity, setQuantity] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [activeFormat, setActiveFormat] = useState(0);
  const [buyerStats, setBuyerStats] = useState<any>(null);
  const [deliveryInfo, setDeliveryInfo] = useState<{ message: string; dateStr: string } | null>(null);

  // Reviews state
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewItems, setReviewItems] = useState(reviews.items);
  const [reviewTotal, setReviewTotal] = useState(reviews.total);
  const [reviewSort, setReviewSort] = useState('newest');
  const [ratingDist, setRatingDist] = useState<Record<number, number>>(
    reviews.meta?.rating_distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  );
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewContent, setReviewContent] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Q&A state
  const [qnaPage, setQnaPage] = useState(1);
  const [qnaItems, setQnaItems] = useState(qna.items);
  const [qnaTotal, setQnaTotal] = useState(qna.total);
  const [expandedQna, setExpandedQna] = useState<number | null>(null);
  const [showQnaModal, setShowQnaModal] = useState(false);
  const [qnaTitle, setQnaTitle] = useState('');
  const [qnaBody, setQnaBody] = useState('');
  const [qnaSecret, setQnaSecret] = useState(false);
  const [qnaSubmitting, setQnaSubmitting] = useState(false);

  const { user, refreshCartCount } = useAuth();

  useEffect(() => {
    if (product && user) {
      fetch(`/api/v1/users/recently-viewed?goods_no=${product.goods_no}`, { method: 'POST' }).catch(() => {});
    }
  }, [product?.goods_no, user]);

  useEffect(() => {
    if (product && typeof window !== 'undefined') {
      const key = 'yes24_recently_viewed';
      const existing: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      const updated = [product.goods_no, ...existing.filter(id => id !== product.goods_no)].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(updated));
    }
  }, [product?.goods_no]);

  // FIX 4: Delivery estimate (client-side only to avoid SSR mismatch)
  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    const cutoff = 14;
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    let deliveryDate: Date;
    let message: string;
    if (hour < cutoff) {
      deliveryDate = new Date(now);
      deliveryDate.setDate(deliveryDate.getDate() + 1);
      if (deliveryDate.getDay() === 0) deliveryDate.setDate(deliveryDate.getDate() + 1);
      message = `오늘 오후 ${cutoff}시 이전 주문 시`;
    } else {
      deliveryDate = new Date(now);
      deliveryDate.setDate(deliveryDate.getDate() + 2);
      if (deliveryDate.getDay() === 0) deliveryDate.setDate(deliveryDate.getDate() + 1);
      message = `내일 오후 ${cutoff}시 이전 주문 시`;
    }
    const month = deliveryDate.getMonth() + 1;
    const date = deliveryDate.getDate();
    const day = days[deliveryDate.getDay()];
    setDeliveryInfo({ message, dateStr: `${month}월 ${date}일(${day}) 도착 예정` });
  }, []);

  // Open preview modal
  const openPreview = async () => {
    if (!previewData && product) {
      try {
        const res = await fetch(`/api/v1/products/${product.goods_no}/preview`);
        if (res.ok) setPreviewData(await res.json());
      } catch {}
    }
    setPreviewPage(0);
    setShowPreview(true);
  };

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
      await refreshCartCount();
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

  // Review functions
  const fetchReviews = async (page: number, sort: string) => {
    try {
      const res = await fetch(`/api/v1/products/${product.goods_no}/reviews?page=${page}&size=10&sort=${sort}`);
      const data = await res.json();
      setReviewItems(data.items || []);
      setReviewTotal(data.total || 0);
      setReviewPage(page);
      if (data.meta?.rating_distribution) setRatingDist(data.meta.rating_distribution);
    } catch {}
  };

  const handleReviewSort = (newSort: string) => {
    setReviewSort(newSort);
    fetchReviews(1, newSort);
  };

  const submitReview = async () => {
    if (!reviewContent.trim()) { alert('리뷰 내용을 입력해주세요.'); return; }
    setReviewSubmitting(true);
    try {
      const res = await fetch(`/api/v1/products/${product.goods_no}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, title: reviewTitle || undefined, content: reviewContent }),
      });
      if (res.ok) {
        setReviewContent('');
        setReviewTitle('');
        setReviewRating(5);
        setShowReviewForm(false);
        fetchReviews(1, reviewSort);
        alert('리뷰가 등록되었습니다.');
      } else {
        const err = await res.json();
        alert(err.detail || '리뷰 등록에 실패했습니다.');
      }
    } catch { alert('로그인이 필요합니다.'); }
    setReviewSubmitting(false);
  };

  const toggleHelpful = async (reviewId: number) => {
    if (!user) { alert('로그인이 필요합니다.'); return; }
    try {
      const res = await fetch(`/api/v1/reviews/${reviewId}/helpful`, { method: 'POST' });
      const data = await res.json();
      setReviewItems(prev => prev.map(r =>
        r.id === reviewId
          ? { ...r, helpful_count: data.helpful_count, is_helpful: data.is_helpful, likes: data.helpful_count }
          : r
      ));
    } catch {}
  };

  // Q&A functions
  const fetchQna = async (page: number) => {
    try {
      const res = await fetch(`/api/v1/products/${product.goods_no}/qna?page=${page}&size=10`);
      const data = await res.json();
      setQnaItems(data.items || []);
      setQnaTotal(data.total || 0);
      setQnaPage(page);
    } catch {}
  };

  const submitQna = async () => {
    if (!qnaTitle.trim() || !qnaBody.trim()) { alert('제목과 내용을 입력해주세요.'); return; }
    if (!user) { alert('로그인이 필요합니다.'); return; }
    setQnaSubmitting(true);
    try {
      const res = await fetch(`/api/v1/products/${product.goods_no}/qna`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: qnaTitle, body: qnaBody, is_secret: qnaSecret }),
      });
      if (res.ok) {
        setQnaTitle('');
        setQnaBody('');
        setQnaSecret(false);
        setShowQnaModal(false);
        fetchQna(1);
        alert('질문이 등록되었습니다.');
      } else {
        const err = await res.json();
        alert(err.detail || '질문 등록에 실패했습니다.');
      }
    } catch { alert('로그인이 필요합니다.'); }
    setQnaSubmitting(false);
  };

  const totalDistReviews = Object.values(ratingDist).reduce((a, b) => a + b, 0);

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
          <div style={{ width: 300, flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ display: 'block', border: '1px solid #ebebeb', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
                <img src={getCoverUrl(product.cover_image, product.goods_no)} alt={product.title} style={{ width: '100%', height: 420, objectFit: 'cover', display: 'block' }} />
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
            {/* Category breadcrumb */}
            {product.category_code && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#888', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, color: '#333', marginBottom: 4 }}>이 책이 속한 분야</div>
                <Link href={`/Product/Category/Display/${product.category_code.slice(0, 3)}`} style={{ color: '#0080ff' }}>국내도서</Link>
                <span style={{ margin: '0 4px', color: '#ccc' }}>&gt;</span>
                <Link href={`/Product/Category/Display/${product.category_code.slice(0, 6)}`} style={{ color: '#0080ff' }}>{product.category_code.slice(0, 6)}</Link>
              </div>
            )}

            {/* Share & Preview buttons */}
            <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
              <button className="btnC m_size" style={{ flex: 1 }} onClick={openPreview}>미리보기</button>
            </div>

            {/* Share buttons row */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>공유하기</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { window.open(`https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(window.location.href)}`, '_blank', 'width=500,height=600'); }} style={{ flex: 1, padding: '6px 0', fontSize: 11, border: '1px solid #fee500', background: '#fee500', borderRadius: 3, cursor: 'pointer', fontWeight: 600, color: '#3c1e1e' }}>카카오톡</button>
                <button onClick={() => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(product.title)}&url=${encodeURIComponent(window.location.href)}`, '_blank', 'width=500,height=400'); }} style={{ flex: 1, padding: '6px 0', fontSize: 11, border: '1px solid #1da1f2', background: '#1da1f2', borderRadius: 3, cursor: 'pointer', fontWeight: 600, color: '#fff' }}>트위터</button>
                <button onClick={shareUrl} style={{ flex: 1, padding: '6px 0', fontSize: 11, border: '1px solid #d8d8d8', background: '#fff', borderRadius: 3, cursor: 'pointer', fontWeight: 600, color: '#333' }}>링크복사</button>
              </div>
            </div>

            {/* Report link */}
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <button onClick={() => alert('신고가 접수되었습니다.')} style={{ background: 'none', border: 'none', fontSize: 11, color: '#999', cursor: 'pointer', textDecoration: 'underline' }}>신고하기</button>
            </div>
          </div>

          {/* Right: Product Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badge row */}
            <div style={{ marginBottom: 8, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              <span className="iconC accent"><em className="txt">소득공제</em></span>
              {product.sales_index > 500 && (
                <span style={{ display: 'inline-block', padding: '2px 8px', background: '#fff0f0', color: '#e51937', border: '1px solid #e51937', borderRadius: 2, fontSize: 11, fontWeight: 700 }}>베스트셀러</span>
              )}
              {product.publish_date && (() => {
                const pubDate = new Date(product.publish_date);
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                return pubDate >= threeMonthsAgo;
              })() && (
                <span style={{ display: 'inline-block', padding: '2px 8px', background: '#e8f5e9', color: '#2e7d32', border: '1px solid #2e7d32', borderRadius: 2, fontSize: 11, fontWeight: 700 }}>신간</span>
              )}
              <span style={{ display: 'inline-block', padding: '2px 8px', background: '#e8f4ff', color: '#0080ff', border: '1px solid #0080ff', borderRadius: 2, fontSize: 11, fontWeight: 700 }}>MD추천</span>
              {!product.is_available && <span className="iconC" style={{ background: '#fff3e5', color: '#e67e22', marginLeft: 4 }}><em className="txt">품절</em></span>}
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 600, color: '#333', lineHeight: 1.4, marginBottom: 8 }}>
              {product.title}
              {activeFormat === 1 && <span style={{ fontSize: 12, color: '#0080ff', marginLeft: 8 }}>(전자책)</span>}
              {activeFormat === 2 && <span style={{ fontSize: 12, color: '#9c27b0', marginLeft: 8 }}>(오디오)</span>}
            </h2>
            {product.subtitle && (
              <p style={{ fontSize: 13, color: '#666', marginBottom: 10 }}>{product.subtitle}</p>
            )}

            {/* FIX 3: Format tabs */}
            {(product as any).formats && (product as any).formats.length > 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {(product as any).formats.map((f: any, idx: number) => (
                  <button key={f.type} onClick={() => setActiveFormat(idx)}
                    style={{
                      padding: '6px 14px', fontSize: 12, border: '1px solid',
                      borderColor: activeFormat === idx ? '#0080ff' : '#d8d8d8',
                      background: activeFormat === idx ? '#e5f2ff' : '#fff',
                      color: activeFormat === idx ? '#0080ff' : '#333',
                      fontWeight: activeFormat === idx ? 700 : 400,
                      cursor: 'pointer', borderRadius: 3,
                    }}>
                    {f.type} {f.price.toLocaleString()}원
                  </button>
                ))}
              </div>
            )}

            <div style={{ fontSize: 13, color: '#666', marginBottom: 15, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
              <span><Link href={`/Author/${encodeURIComponent(product.author)}`} style={{ color: '#0080ff' }}>{product.author}</Link> 저</span>
              {product.translator && (
                <><span style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', margin: '0 8px', verticalAlign: 'middle' }} /><span>{product.translator} 역</span></>
              )}
              <span style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', margin: '0 8px', verticalAlign: 'middle' }} />
              <span><Link href={`/Publisher/${encodeURIComponent(product.publisher)}`} style={{ color: '#0080ff' }}>{product.publisher}</Link></span>
              {product.publish_date && (
                <><span style={{ display: 'inline-block', width: 1, height: 10, background: '#ddd', margin: '0 8px', verticalAlign: 'middle' }} /><span>{product.publish_date}</span></>
              )}
            </div>

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

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
              <tbody>
                <tr>
                  <td style={{ width: 80, padding: '6px 0', fontSize: 12, color: '#999', verticalAlign: 'top' }}>정가</td>
                  <td style={{ padding: '6px 0', fontSize: 13 }}>
                    <span style={{ textDecoration: product.discount_rate > 0 ? 'line-through' : 'none', color: '#999' }}>{product.original_price.toLocaleString()}원</span>
                  </td>
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
                    <strong style={{ color: '#0080ff' }}>{pointEarn.toLocaleString()}원</strong>
                    <span style={{ color: '#666', marginLeft: 4 }}>({product.point_rate || 5}% 적립)</span>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ padding: '12px 15px', background: '#f8f8f8', borderRadius: 3, marginBottom: 15, fontSize: 12, color: '#666' }}>
              <span style={{ fontWeight: 700, color: '#333', marginRight: 8 }}>배송안내</span>
              오후 2시 전 주문 시 당일 출고 (주말, 공휴일 제외)
              <span style={{ display: 'inline-block', marginLeft: 8, padding: '2px 6px', background: '#e8f4ff', color: '#0080ff', fontSize: 11, fontWeight: 600, borderRadius: 2 }}>
                15,000원 이상 무료배송
              </span>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#333', fontWeight: 600 }}>오늘 주문 시 내일 도착 예정</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {product.is_available ? (
                    <>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2e7d32' }} />
                      <span style={{ color: '#2e7d32', fontWeight: 600 }}>재고 있음</span>
                    </>
                  ) : (
                    <>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#e51937' }} />
                      <span style={{ color: '#e51937', fontWeight: 600 }}>품절</span>
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* FIX 4: Delivery estimate */}
            {deliveryInfo && (
              <div style={{ fontSize: 12, color: '#555', marginTop: 8, marginBottom: 12, padding: '8px 12px', background: '#f0f7ff', borderRadius: 3, borderLeft: '3px solid #0080ff' }}>
                <span style={{ color: '#0080ff', fontWeight: 600 }}>빠른 배송</span>
                {' '}{deliveryInfo.message}{' '}
                <strong style={{ color: '#333' }}>{deliveryInfo.dateStr}</strong>
              </div>
            )}

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
              { key: 'reviews', label: `회원리뷰 (${reviewTotal})` },
              { key: 'qna', label: `상품Q&A (${qnaTotal})` },
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
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeTab === 'info' && (
              <div>
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
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                    책 소개
                  </h3>
                  <div style={{ fontSize: 13, lineHeight: 1.8, color: '#555', position: 'relative' }}>
                    <div style={{
                      maxHeight: showFullDesc ? 'none' : 200,
                      overflow: 'hidden',
                      transition: 'max-height 0.3s',
                    }}>
                      {product.description || '상품 설명이 준비 중입니다.'}
                    </div>
                    {product.description && product.description.length > 300 && !showFullDesc && (
                      <div style={{
                        position: 'relative', marginTop: -40, paddingTop: 40,
                        background: 'linear-gradient(transparent, #fff)',
                        textAlign: 'center',
                      }}>
                        <button
                          onClick={() => setShowFullDesc(true)}
                          className="btnC m_size"
                          style={{ fontSize: 12 }}
                        >
                          더보기 ▼
                        </button>
                      </div>
                    )}
                    {showFullDesc && product.description && product.description.length > 300 && (
                      <div style={{ textAlign: 'center', marginTop: 10 }}>
                        <button onClick={() => setShowFullDesc(false)} className="btnC m_size" style={{ fontSize: 12 }}>
                          접기 ▲
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {product.tags && product.tags.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    {product.tags.map((tag, i) => (
                      <span key={i} className="tag"><a>#{tag}</a></span>
                    ))}
                  </div>
                )}

                {/* FIX 6: Buyer stats */}
                <div style={{ marginTop: 30 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                    구매자 분석
                  </h3>
                  {!buyerStats ? (
                    <button className="btnC m_size" onClick={async () => {
                      try {
                        const res = await fetch(`/api/v1/products/${product.goods_no}/stats`);
                        if (res.ok) setBuyerStats(await res.json());
                      } catch {}
                    }}>통계 보기</button>
                  ) : (
                    <div style={{ fontSize: 13, color: '#555' }}>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>성별 비율</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#0080ff' }}>남성 {buyerStats.gender['남성']}%</span>
                          <div style={{ flex: 1, display: 'flex', height: 12, borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ width: `${buyerStats.gender['남성']}%`, background: '#0080ff', height: '100%' }} />
                            <div style={{ width: `${buyerStats.gender['여성']}%`, background: '#e91e63', height: '100%' }} />
                          </div>
                          <span style={{ fontSize: 12, color: '#e91e63' }}>여성 {buyerStats.gender['여성']}%</span>
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 8 }}>연령대</div>
                        {Object.entries(buyerStats.age_distribution).map(([label, value]: [string, any]) => (
                          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ width: 60, fontSize: 12, color: '#666' }}>{label}</span>
                            <div style={{ flex: 1, background: '#f0f0f0', borderRadius: 2, height: 12 }}>
                              <div style={{ width: `${value}%`, background: '#0080ff', height: '100%', borderRadius: 2 }} />
                            </div>
                            <span style={{ width: 32, fontSize: 12, color: '#333', textAlign: 'right' }}>{value}%</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#666' }}>
                        <span>재구매율: <strong style={{ color: '#333' }}>{buyerStats.reorder_rate}%</strong></span>
                        <span>선물 구매: <strong style={{ color: '#333' }}>{buyerStats.gift_rate}%</strong></span>
                      </div>
                    </div>
                  )}
                </div>
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

            {/* ===== REVIEWS TAB ===== */}
            {activeTab === 'reviews' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                  회원 리뷰 <span style={{ color: '#0080ff' }}>({reviewTotal}건)</span>
                </h3>

                {/* Rating distribution bar chart */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 20, background: '#f8f8f8', marginBottom: 20, borderRadius: 3 }}>
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#333' }}>{Number(product.rating_avg).toFixed(1)}</div>
                    <Stars rating={Number(product.rating_avg)} size={16} />
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{reviewTotal}건</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = ratingDist[star] || 0;
                      const pct = totalDistReviews > 0 ? (count / totalDistReviews * 100) : 0;
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, color: '#999', width: 30 }}>별점 {star}</span>
                          <div style={{ flex: 1, height: 10, background: '#e5e5e5', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#ffb800', borderRadius: 5, transition: 'width 0.3s' }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#666', width: 30, textAlign: 'right' }}>{count}</span>
                          <span style={{ fontSize: 10, color: '#bbb', width: 35, textAlign: 'right' }}>{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sort bar + write button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[
                      { key: 'newest', label: '최신순' },
                      { key: 'helpful', label: '도움이돼요순' },
                      { key: 'rating_high', label: '별점높은순' },
                      { key: 'rating_low', label: '별점낮은순' },
                    ].map(s => (
                      <button
                        key={s.key}
                        onClick={() => handleReviewSort(s.key)}
                        style={{
                          padding: '5px 12px', fontSize: 12, border: '1px solid #d8d8d8',
                          background: reviewSort === s.key ? '#333' : '#fff',
                          color: reviewSort === s.key ? '#fff' : '#666',
                          cursor: 'pointer', borderRadius: 2,
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btnC btn_blue m_size"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      if (!user) { alert('로그인이 필요합니다.'); router.push('/Templates/FTLogin'); return; }
                      setShowReviewForm(!showReviewForm);
                    }}
                  >
                    리뷰쓰기
                  </button>
                </div>

                {/* Review write form (inline) */}
                {showReviewForm && (
                  <div style={{ padding: 20, background: '#f8f8f8', borderRadius: 3, marginBottom: 20, border: '1px solid #ebebeb' }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 12 }}>리뷰 작성</h4>
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: '#666', marginRight: 8 }}>평점</span>
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: star <= reviewRating ? '#ffb800' : '#ddd', padding: '0 1px' }}
                        >
                          {star <= reviewRating ? '\u2605' : '\u2606'}
                        </button>
                      ))}
                      <span style={{ fontSize: 12, color: '#999', marginLeft: 6 }}>{reviewRating}점</span>
                    </div>
                    <input
                      type="text"
                      value={reviewTitle}
                      onChange={e => setReviewTitle(e.target.value)}
                      placeholder="리뷰 제목 (선택)"
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #d8d8d8', borderRadius: 3, fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }}
                    />
                    <textarea
                      value={reviewContent}
                      onChange={(e) => setReviewContent(e.target.value)}
                      placeholder="리뷰 내용을 입력해 주세요."
                      style={{ width: '100%', height: 80, padding: 10, border: '1px solid #d8d8d8', borderRadius: 3, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                    />
                    <div style={{ textAlign: 'right', marginTop: 8 }}>
                      <button className="btnC m_size" onClick={() => setShowReviewForm(false)} style={{ fontSize: 12, marginRight: 6 }}>취소</button>
                      <button className="btnC btn_blue m_size" onClick={submitReview} disabled={reviewSubmitting} style={{ fontSize: 12 }}>
                        {reviewSubmitting ? '등록 중...' : '리뷰 등록'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Review list */}
                {reviewItems.map(review => (
                  <div key={review.id} style={{ padding: '15px 0', borderBottom: '1px solid #ebebeb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <Stars rating={review.rating} />
                        <span style={{ marginLeft: 6, fontWeight: 700, fontSize: 12, color: '#333' }}>
                          {maskUsername(review.username)}
                        </span>
                        <span style={{
                          marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 2,
                          background: (review.helpful_count ?? review.likes) >= 5 ? '#fff8e1' : '#f5f5f5',
                          color: (review.helpful_count ?? review.likes) >= 5 ? '#f59e0b' : '#999',
                          border: `1px solid ${(review.helpful_count ?? review.likes) >= 5 ? '#f59e0b' : '#ddd'}`,
                          fontWeight: 600,
                        }}>
                          {(review.helpful_count ?? review.likes) >= 5 ? '우수회원' : '일반회원'}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#999' }}>
                        {review.created_at ? new Date(review.created_at).toLocaleDateString('ko-KR') : ''}
                      </span>
                    </div>
                    {review.title && <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 5, color: '#333' }}>{review.title}</div>}
                    <div style={{ fontSize: 13, lineHeight: 1.6, color: '#555' }}>{review.content}</div>
                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={() => toggleHelpful(review.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 12px', border: '1px solid',
                          borderColor: review.is_helpful ? '#0080ff' : '#d8d8d8',
                          background: review.is_helpful ? '#f0f7ff' : '#fff',
                          color: review.is_helpful ? '#0080ff' : '#666',
                          borderRadius: 20, fontSize: 12, cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <span>&#128077;</span>
                        도움이 돼요 ({review.helpful_count ?? review.likes})
                      </button>
                    </div>
                  </div>
                ))}

                {reviewItems.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                    아직 작성된 리뷰가 없습니다.
                  </div>
                )}

                {/* Review pagination */}
                {reviewTotal > 10 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 20 }}>
                    {Array.from({ length: Math.ceil(reviewTotal / 10) }, (_, i) => i + 1).slice(0, 10).map(p => (
                      <button
                        key={p}
                        onClick={() => fetchReviews(p, reviewSort)}
                        style={{
                          width: 30, height: 30, border: '1px solid #d8d8d8',
                          background: p === reviewPage ? '#333' : '#fff',
                          color: p === reviewPage ? '#fff' : '#333',
                          fontSize: 12, cursor: 'pointer', borderRadius: 2,
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ===== Q&A TAB ===== */}
            {activeTab === 'qna' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', margin: 0 }}>
                    상품 Q&A <span style={{ color: '#0080ff' }}>({qnaTotal}건)</span>
                  </h3>
                  <button
                    className="btnC btn_blue m_size"
                    style={{ fontSize: 12 }}
                    onClick={() => {
                      if (!user) { alert('로그인이 필요합니다.'); router.push('/Templates/FTLogin'); return; }
                      setShowQnaModal(true);
                    }}
                  >
                    질문하기
                  </button>
                </div>

                <div style={{ fontSize: 12, color: '#999', marginBottom: 15, padding: '10px 12px', background: '#f8f8f8', borderRadius: 3 }}>
                  상품과 관련없는 내용이나 광고, 비방 등의 글은 사전 통보 없이 삭제될 수 있습니다.
                </div>

                {/* Q&A list */}
                {qnaItems.length === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>
                    등록된 상품 Q&A가 없습니다.
                  </div>
                )}

                {qnaItems.map(q => (
                  <div key={q.id} style={{ borderBottom: '1px solid #ebebeb' }}>
                    <div
                      style={{ padding: '12px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onClick={() => setExpandedQna(expandedQna === q.id ? null : q.id)}
                    >
                      <span style={{
                        display: 'inline-block', fontSize: 11, fontWeight: 700, width: 14, textAlign: 'center',
                        color: '#0080ff',
                      }}>Q</span>
                      <span style={{ flex: 1, fontSize: 13, color: '#333' }}>
                        {q.is_secret ? (
                          <span style={{ color: '#999' }}>
                            <span style={{
                              display: 'inline-block', padding: '1px 5px', background: '#f0f0f0',
                              border: '1px solid #ddd', borderRadius: 2, fontSize: 10, marginRight: 6, color: '#999',
                            }}>비밀글</span>
                            {q.question_body === null ? '비밀글입니다.' : q.question_title}
                          </span>
                        ) : q.question_title}
                      </span>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 2, fontSize: 10, fontWeight: 600,
                        background: q.is_answered ? '#e8f5e9' : '#fff3e0',
                        color: q.is_answered ? '#2e7d32' : '#e65100',
                      }}>
                        {q.is_answered ? '답변완료' : '답변대기'}
                      </span>
                      <span style={{ fontSize: 11, color: '#bbb', width: 70, textAlign: 'right' }}>
                        {q.created_at ? new Date(q.created_at).toLocaleDateString('ko-KR') : ''}
                      </span>
                      <span style={{ fontSize: 11, color: '#999', width: 50, textAlign: 'right' }}>
                        {maskUsername(q.username)}
                      </span>
                    </div>

                    {/* Expanded answer */}
                    {expandedQna === q.id && q.question_body !== null && (
                      <div style={{ padding: '0 0 15px 22px' }}>
                        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 10, padding: '10px 12px', background: '#fafafa', borderRadius: 3 }}>
                          {q.question_body}
                        </div>
                        {q.is_answered && q.answer_body && (
                          <div style={{ padding: '12px', background: '#f0f7ff', borderRadius: 3, borderLeft: '3px solid #0080ff' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#0080ff', marginBottom: 6 }}>
                              판매자 답변
                              {q.answered_at && (
                                <span style={{ fontWeight: 400, color: '#999', marginLeft: 8 }}>
                                  {new Date(q.answered_at).toLocaleDateString('ko-KR')}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6 }}>{q.answer_body}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Q&A pagination */}
                {qnaTotal > 10 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 20 }}>
                    {Array.from({ length: Math.ceil(qnaTotal / 10) }, (_, i) => i + 1).slice(0, 10).map(p => (
                      <button
                        key={p}
                        onClick={() => fetchQna(p)}
                        style={{
                          width: 30, height: 30, border: '1px solid #d8d8d8',
                          background: p === qnaPage ? '#333' : '#fff',
                          color: p === qnaPage ? '#fff' : '#333',
                          fontSize: 12, cursor: 'pointer', borderRadius: 2,
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {/* Q&A Modal */}
                {showQnaModal && (
                  <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }} onClick={(e) => { if (e.target === e.currentTarget) setShowQnaModal(false); }}>
                    <div style={{ background: '#fff', borderRadius: 6, width: 480, padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}>
                      <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: '#333' }}>질문하기</h4>
                      <input
                        type="text"
                        value={qnaTitle}
                        onChange={e => setQnaTitle(e.target.value)}
                        placeholder="질문 제목"
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #d8d8d8', borderRadius: 3, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
                      />
                      <textarea
                        value={qnaBody}
                        onChange={e => setQnaBody(e.target.value)}
                        placeholder="질문 내용을 입력해 주세요."
                        style={{ width: '100%', height: 120, padding: '10px 12px', border: '1px solid #d8d8d8', borderRadius: 3, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 13, color: '#666', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={qnaSecret}
                          onChange={e => setQnaSecret(e.target.checked)}
                        />
                        비밀글로 작성
                      </label>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <button className="btnC m_size" onClick={() => setShowQnaModal(false)} style={{ fontSize: 12 }}>취소</button>
                        <button className="btnC btn_blue m_size" onClick={submitQna} disabled={qnaSubmitting} style={{ fontSize: 12 }}>
                          {qnaSubmitting ? '등록 중...' : '질문 등록'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'shipping' && (
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#333', marginBottom: 12, paddingBottom: 8, borderBottom: '2px solid #333' }}>
                  배송/반품/교환 안내
                </h3>

                {/* 배송 안내 */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10, paddingLeft: 10, borderLeft: '3px solid #0080ff' }}>
                    배송 안내
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', width: 120, fontWeight: 500, color: '#333' }}>배송비</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb', lineHeight: 1.6 }}>2만원 이상 구매 시 <strong style={{ color: '#0080ff' }}>무료배송</strong><br/>2만원 미만 시 배송비 2,500원</td></tr>
                      <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500, color: '#333' }}>예상 출고일</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb', lineHeight: 1.6 }}>오후 2시 이전 주문 시 <strong>당일 출고</strong> (영업일 기준)<br/>오후 2시 이후 주문 시 다음 영업일 출고</td></tr>
                      <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500, color: '#333' }}>배송기간</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>출고 후 1~2일 이내 도착 (도서산간 지역 추가 소요)</td></tr>
                      <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500, color: '#333' }}>배송방법</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>CJ대한통운 택배</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* 교환/반품 안내 */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10, paddingLeft: 10, borderLeft: '3px solid #0080ff' }}>
                    교환/반품 안내
                  </h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <tbody>
                      <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', width: 120, fontWeight: 500, color: '#333' }}>반품/교환 기한</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>상품 수령 후 <strong>10일 이내</strong></td></tr>
                      <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500, color: '#333' }}>반품 배송비</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>편도 2,500원 (고객 귀책 사유 시)</td></tr>
                      <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500, color: '#333' }}>교환 배송비</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>편도 2,500원 (고객 귀책 사유 시)</td></tr>
                      <tr><td style={{ padding: '10px 12px', background: '#f8f8f8', border: '1px solid #ebebeb', fontWeight: 500, color: '#333' }}>반품 주소</td><td style={{ padding: '10px 12px', border: '1px solid #ebebeb' }}>경기도 파주시 문발로 20 YES24 물류센터</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* 환불 안내 */}
                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10, paddingLeft: 10, borderLeft: '3px solid #0080ff' }}>
                    환불 안내
                  </h4>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8, padding: '0 12px' }}>
                    <p style={{ marginBottom: 8 }}>• 카드 결제 시: 카드 승인 취소 (3~5영업일 소요)</p>
                    <p style={{ marginBottom: 8 }}>• 실시간 계좌이체 시: 계좌 환불 (1~2영업일 소요)</p>
                    <p style={{ marginBottom: 8 }}>• YES포인트 결제 시: 즉시 포인트 반환</p>
                    <p>• 복합 결제 시: 각 결제수단별 환불 처리</p>
                  </div>
                </div>

                {/* 반품/교환 불가 사유 */}
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10, paddingLeft: 10, borderLeft: '3px solid #e51937' }}>
                    반품/교환 불가 사유
                  </h4>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.8, padding: '0 12px' }}>
                    <ul style={{ paddingLeft: 16, listStyle: 'disc' }}>
                      <li>소비자의 책임 있는 사유로 상품이 훼손된 경우</li>
                      <li>포장을 개봉하였거나 포장이 훼손되어 상품가치가 감소한 경우</li>
                      <li>소비자의 사용에 의해 상품 등의 가치가 감소한 경우</li>
                      <li>시간의 경과에 의해 재판매가 곤란한 정도로 가치가 감소한 경우</li>
                      <li>복제가 가능한 상품의 포장을 훼손한 경우 (CD/DVD 등)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div style={{ width: 200, flexShrink: 0 }}>
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

            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', paddingBottom: 8, borderBottom: '2px solid #333', marginBottom: 10 }}>
                추천 도서
              </h4>
              {related.slice(0, 3).map(p => (
                <div key={p.id} style={{ marginBottom: 15, display: 'flex', gap: 8 }}>
                  <Link href={`/Product/Goods/${p.goods_no}`}>
                    <img src={getCoverUrl(p.cover_image, p.goods_no)} alt={p.title} style={{ width: 55, border: '1px solid #ebebeb' }} loading="lazy" />
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

        {/* 관련상품 Section */}
        <div style={{ marginTop: 40 }}>
          {/* 이 책을 구매한 사람들이 함께 구매한 책 */}
          <RelatedCarousel title="이 책을 구매한 사람들이 함께 구매한 책" products={related.slice(0, 6)} />

          {/* 이 책을 본 사람들이 함께 본 책 */}
          <RelatedCarousel title="이 책을 본 사람들이 함께 본 책" products={related} />

          {/* 같은 저자의 다른 책 */}
          {sameAuthor.filter(p => p.goods_no !== product.goods_no).length > 0 && (
            <RelatedCarousel title={`같은 저자의 다른 책 — ${product.author}`} products={sameAuthor.filter(p => p.goods_no !== product.goods_no)} />
          )}

          {/* 같은 출판사의 다른 책 */}
          {samePublisher.filter(p => p.goods_no !== product.goods_no).length > 0 && (
            <RelatedCarousel title={`같은 출판사의 다른 책 — ${product.publisher}`} products={samePublisher.filter(p => p.goods_no !== product.goods_no)} />
          )}
        </div>
      </div>

      {showPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={(e) => { if (e.target === e.currentTarget) setShowPreview(false); }}>
          <div style={{ background: '#fff', borderRadius: 8, width: 600, maxHeight: '90vh', overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>미리보기</h3>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#999', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: 20, textAlign: 'center', minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
              <img
                src={`https://picsum.photos/seed/${product.goods_no}-${previewPage}/400/560`}
                alt={`미리보기 ${previewPage + 1}페이지`}
                style={{ maxHeight: '60vh', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
              />
            </div>
            <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ebebeb' }}>
              <button
                onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                disabled={previewPage === 0}
                className="btnC m_size"
                style={{ opacity: previewPage === 0 ? 0.4 : 1 }}
              >
                ← 이전
              </button>
              <span style={{ fontSize: 12, color: '#999' }}>{previewPage + 1} / 5</span>
              <button
                onClick={() => setPreviewPage(Math.min(4, previewPage + 1))}
                disabled={previewPage === 4}
                className="btnC m_size"
                style={{ opacity: previewPage === 4 ? 0.4 : 1 }}
              >
                다음 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIX 2: Preview Modal */}
      {showPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPreview(false)}>
          <div style={{ background: '#fff', width: 600, maxHeight: '80vh', borderRadius: 8, overflow: 'auto', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPreview(false)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#666', zIndex: 1 }}>✕</button>
            <div style={{ padding: '20px 30px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid #ebebeb', paddingBottom: 10 }}>미리보기</h3>
              {previewData ? (
                <>
                  {previewData.pages[previewPage]?.type === 'cover' ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', background: '#1a1a3e', color: '#fff', borderRadius: 4, marginBottom: 16 }}>
                      <div style={{ fontSize: 22, fontWeight: 700 }}>{previewData.pages[previewPage].content}</div>
                    </div>
                  ) : previewData.pages[previewPage]?.type === 'toc' ? (
                    <div style={{ padding: '20px 0', whiteSpace: 'pre-line', fontSize: 13, lineHeight: 2, marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, marginBottom: 8 }}>목차</div>
                      {previewData.pages[previewPage].content}
                    </div>
                  ) : (
                    <div style={{ padding: '20px 0', fontSize: 13, lineHeight: 1.8, color: '#555', marginBottom: 16 }}>
                      {previewData.pages[previewPage]?.content}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #ebebeb', paddingTop: 12 }}>
                    <button className="btnC m_size" disabled={previewPage === 0} onClick={() => setPreviewPage(p => p - 1)}>이전</button>
                    <span style={{ fontSize: 12, color: '#999' }}>{previewPage + 1} / {previewData.pages.length}</span>
                    <button className="btnC m_size" disabled={previewPage >= previewData.pages.length - 1} onClick={() => setPreviewPage(p => p + 1)}>다음</button>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>불러오는 중...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
