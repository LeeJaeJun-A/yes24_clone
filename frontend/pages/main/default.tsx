import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { Product, Banner } from '@/lib/types';
import { getImageUrl, formatPrice } from '@/lib/constants';
import ProductCard from '@/components/common/ProductCard';

const BANNER_SLIDES = [
  { title: '이달의 베스트셀러', sub: '독자들이 가장 많이 선택한 책', desc: '매달 업데이트되는 인기 도서를 확인하세요', bg: 'linear-gradient(135deg, #003466 0%, #1a5276 100%)' },
  { title: '2026 신간 추천 컬렉션', sub: '올해 주목해야 할 신간 도서', desc: 'YES24 에디터가 엄선한 신간 목록', bg: 'linear-gradient(135deg, #1a3a5c 0%, #2c3e50 100%)' },
  { title: '화제의 신간', sub: '지금 가장 핫한 책을 만나보세요', desc: 'SNS에서 화제인 도서 모음', bg: 'linear-gradient(135deg, #2c1654 0%, #4a1a8a 100%)' },
  { title: 'MD가 선택한 책', sub: 'YES24 MD가 직접 선정한 추천도서', desc: '전문 MD의 안목으로 골라낸 필독서', bg: 'linear-gradient(135deg, #0f3460 0%, #16537e 100%)' },
  { title: '올해의 도서', sub: '2026년을 대표하는 베스트 도서', desc: '올 한해를 빛낸 책들의 향연', bg: 'linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 100%)' },
];

const MAIN_CATS = [
  { code: '001', name: '국내도서', icon: '📚' },
  { code: '002', name: '외국도서', icon: '🌍' },
  { code: '005', name: 'eBook', icon: '📱' },
  { code: '003', name: 'CD/LP', icon: '💿' },
  { code: '004', name: 'DVD/BD', icon: '📀' },
  { code: '006', name: '문구/GIFT', icon: '🎁' },
  { code: '007', name: '중고샵', icon: '♻️' },
  { code: '008', name: '티켓', icon: '🎫' },
];

const BEST_TABS = [
  { key: 'all', label: '종합' },
  { key: '001', label: '국내도서' },
  { key: '002', label: '외국도서' },
  { key: '005', label: 'eBook' },
];

interface Props {
  bestsellers: Product[];
  newArrivals: Product[];
  recommended: Product[];
  steady: Product[];
  banners: Banner[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const [bestRes, newRes, recRes, steadyRes, bannerRes] = await Promise.all([
      apiFetch<any>('/products/bestseller?size=10', { isServer: true }).catch(() => ({ items: [] })),
      apiFetch<Product[]>('/products/new?limit=12', { isServer: true }).catch(() => []),
      apiFetch<Product[]>('/products/recommended?limit=8', { isServer: true }).catch(() => []),
      apiFetch<any>('/products/steady?size=5', { isServer: true }).catch(() => ({ items: [] })),
      apiFetch<Banner[]>('/banners?slot=main', { isServer: true }).catch(() => []),
    ]);
    return {
      props: {
        bestsellers: bestRes.items || bestRes || [],
        newArrivals: Array.isArray(newRes) ? newRes : [],
        recommended: Array.isArray(recRes) ? recRes : [],
        steady: steadyRes.items || [],
        banners: Array.isArray(bannerRes) ? bannerRes : [],
      },
    };
  } catch {
    return { props: { bestsellers: [], newArrivals: [], recommended: [], steady: [], banners: [] } };
  }
};

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });

  useEffect(() => {
    function calc() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setTimeLeft({
        hours: Math.floor(diff / 3600),
        minutes: Math.floor((diff % 3600) / 60),
        seconds: diff % 60,
        totalSeconds: diff,
      });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return timeLeft;
}

export default function HomePage({ bestsellers, newArrivals, recommended, steady, banners }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bestTab, setBestTab] = useState('all');
  const [bestTabData, setBestTabData] = useState<Product[]>(bestsellers);
  const [bestTabLoading, setBestTabLoading] = useState(false);
  const [flashSaleItems, setFlashSaleItems] = useState<Product[]>([]);
  const [flashSaleLoading, setFlashSaleLoading] = useState(true);
  const timerRef = useRef<NodeJS.Timeout>();
  const countdown = useCountdown();

  // Merge API banners with static fallback
  const slides = banners.length > 0
    ? banners.map((b, i) => ({
        title: b.title || BANNER_SLIDES[i % BANNER_SLIDES.length].title,
        sub: BANNER_SLIDES[i % BANNER_SLIDES.length].sub,
        desc: BANNER_SLIDES[i % BANNER_SLIDES.length].desc,
        bg: BANNER_SLIDES[i % BANNER_SLIDES.length].bg,
        link: b.link_url,
      }))
    : BANNER_SLIDES.map(s => ({ ...s, link: undefined }));

  // Auto-rotate banner
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  // Lazy load flash sale items
  useEffect(() => {
    setFlashSaleLoading(true);
    apiFetch<Product[] | any>('/products/recommended?limit=6')
      .then(res => {
        const items = Array.isArray(res) ? res : res.items || [];
        setFlashSaleItems(items.slice(0, 6));
      })
      .catch(() => setFlashSaleItems([]))
      .finally(() => setFlashSaleLoading(false));
  }, []);

  // Bestseller tab switching
  const handleTabChange = useCallback((tabKey: string) => {
    setBestTab(tabKey);
    if (tabKey === 'all') {
      setBestTabData(bestsellers);
      return;
    }
    setBestTabLoading(true);
    apiFetch<any>(`/products/bestseller?size=10&category=${tabKey}`)
      .then(res => {
        const items = res.items || res || [];
        setBestTabData(Array.isArray(items) ? items : []);
      })
      .catch(() => setBestTabData([]))
      .finally(() => setBestTabLoading(false));
  }, [bestsellers]);

  const prevSlide = () => {
    setCurrentSlide((currentSlide - 1 + slides.length) % slides.length);
    clearInterval(timerRef.current);
  };
  const nextSlide = () => {
    setCurrentSlide((currentSlide + 1) % slides.length);
    clearInterval(timerRef.current);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <>
      <Head>
        <title>YES24 - 대한민국 대표 인터넷서점</title>
        <meta property="og:title" content="YES24 - 대한민국 대표 인터넷서점" />
        <meta property="og:description" content="국내 최대의 인터넷쇼핑몰 YES24. 도서, 음반, DVD, 문구, 티켓 판매" />
      </Head>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 15 }}>

        {/* ========== HERO: LEFT PANEL + BANNER ========== */}
        <div className="hero-section" style={{ display: 'flex', height: 360, marginBottom: 30 }}>
          {/* LEFT: Category Sidebar */}
          <div className="category-sidebar" style={{
            width: 196, flexShrink: 0, background: '#1a1a3e',
            borderRadius: '4px 0 0 4px', display: 'flex', flexDirection: 'column',
            justifyContent: 'center', padding: '0', height: 360,
          }}>
            {MAIN_CATS.map(cat => (
              <Link
                key={cat.code}
                href={`/Product/Category/Display/${cat.code}`}
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '0 18px', fontSize: 14, color: 'rgba(255,255,255,0.88)',
                  fontWeight: 500, textDecoration: 'none',
                  transition: 'all 0.15s', flex: 1,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                  (e.currentTarget as HTMLElement).style.color = '#fff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = '';
                  (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.88)';
                }}
              >
                <span>{cat.name}</span>
              </Link>
            ))}
          </div>

          {/* RIGHT: Hero Banner Carousel */}
          <div className="banner-area" style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '0 4px 4px 0' }}>
            {slides.map((slide, i) => (
              <div key={i} style={{
                position: i === currentSlide ? 'relative' : 'absolute',
                top: 0, left: 0, width: '100%', height: 360,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: slide.bg, color: '#fff', padding: 40,
                opacity: i === currentSlide ? 1 : 0,
                transition: 'opacity 0.6s ease-in-out',
                zIndex: i === currentSlide ? 1 : 0,
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 12, letterSpacing: 2 }}>{slide.sub}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, marginBottom: 12 }}>{slide.title}</div>
                  <div style={{ fontSize: 14, opacity: 0.7 }}>{slide.desc}</div>
                </div>
              </div>
            ))}
            {/* Dot Indicators */}
            <div style={{ position: 'absolute', bottom: 15, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 10 }}>
              {slides.map((_, i) => (
                <button key={i} onClick={() => { setCurrentSlide(i); clearInterval(timerRef.current); }}
                  style={{
                    width: i === currentSlide ? 24 : 8, height: 8, borderRadius: 4, border: 'none',
                    background: i === currentSlide ? '#fff' : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer', transition: 'all 0.3s', padding: 0,
                  }}
                />
              ))}
            </div>
            {/* Left Arrow */}
            <button onClick={prevSlide}
              style={{
                position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
                color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18,
              }}>
              &#8249;
            </button>
            {/* Right Arrow */}
            <button onClick={nextSlide}
              style={{
                position: 'absolute', right: 15, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.3)',
                color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18,
              }}>
              &#8250;
            </button>
          </div>
        </div>

        {/* ========== CATEGORY ICON GRID ========== */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 0,
          marginBottom: 35, border: '1px solid #e5e5e5', borderRadius: 8,
          overflow: 'hidden', background: '#fff',
        }}>
          {MAIN_CATS.map((cat, idx) => (
            <Link key={cat.code} href={`/Product/Category/Display/${cat.code}`}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: 16, textDecoration: 'none', color: '#333', fontSize: 13,
                fontWeight: 500, transition: 'all 0.2s', background: '#fff',
                borderRight: idx < MAIN_CATS.length - 1 ? '1px solid #e5e5e5' : 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e51937';
                (e.currentTarget as HTMLElement).style.background = '#fff8f8';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = '#e5e5e5';
                (e.currentTarget as HTMLElement).style.background = '#fff';
              }}
            >
              <span style={{ fontSize: 32 }}>{cat.icon}</span>
              <span>{cat.name}</span>
            </Link>
          ))}
        </div>

        {/* ========== BESTSELLER with Tabs ========== */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>베스트셀러</h2>
            <Link href="/Product/Category/BestSeller" style={{ fontSize: 12, color: '#999', textDecoration: 'none' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid #ebebeb' }}>
            {BEST_TABS.map(tab => (
              <button key={tab.key} onClick={() => handleTabChange(tab.key)}
                style={{
                  padding: '10px 20px', fontSize: 13, border: 'none', cursor: 'pointer',
                  background: bestTab === tab.key ? '#333' : 'transparent',
                  color: bestTab === tab.key ? '#fff' : '#666',
                  fontWeight: bestTab === tab.key ? 700 : 400,
                  borderRadius: bestTab === tab.key ? '3px 3px 0 0' : 0,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {bestTabLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>불러오는 중...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15 }}>
              {bestTabData.slice(0, 10).map((p, i) => {
                const rc = (p as any).rank_change as string | undefined;
                return (
                  <div key={p.id} style={{ position: 'relative' }}>
                    <ProductCard product={p} rank={i + 1} />
                    {rc && (
                      <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 10, fontWeight: 700, zIndex: 5, padding: '1px 5px', borderRadius: 3, background: rc === 'NEW' ? '#e51937' : rc.startsWith('+') ? '#2e7d32' : rc.startsWith('-') && rc !== '-' ? '#0080ff' : '#999', color: '#fff' }}>
                        {rc === 'NEW' ? 'NEW' : rc === '-' ? '-' : rc.startsWith('+') ? `▲${rc.slice(1)}` : `▼${rc.slice(1)}`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ========== MD추천 (2x2 grid with editorial comment) ========== */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>MD추천</h2>
            <Link href="/Product/Category/Recommended" style={{ fontSize: 12, color: '#999', textDecoration: 'none' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {recommended.slice(0, 4).map(p => (
              <div key={p.id} style={{
                display: 'flex', gap: 16, padding: 20,
                border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff',
                transition: 'box-shadow 0.2s',
              }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
              >
                <div style={{ width: 100, flexShrink: 0 }}>
                  <Link href={`/Product/Goods/${p.goods_no}`}>
                    <img
                      src={getImageUrl(p.cover_image) || `https://picsum.photos/seed/${p.goods_no}/200/280`}
                      alt={p.title}
                      style={{ width: '100%', display: 'block', border: '1px solid #ebebeb', borderRadius: 4 }}
                      loading="lazy"
                    />
                  </Link>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link href={`/Product/Goods/${p.goods_no}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 6,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {p.title}
                    </div>
                  </Link>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>
                    {p.author} | {p.publisher}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e51937', marginBottom: 10 }}>
                    {p.discount_rate > 0 && <span style={{ marginRight: 4 }}>{p.discount_rate}%</span>}
                    {formatPrice(p.sale_price)}
                  </div>
                  {p.subtitle && (
                    <div style={{
                      fontSize: 12, color: '#666', lineHeight: 1.6,
                      padding: '8px 10px', background: '#f9f9f9', borderRadius: 4,
                      borderLeft: '3px solid #e51937',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      &ldquo;{p.subtitle}&rdquo;
                    </div>
                  )}
                  {!p.subtitle && (
                    <div style={{
                      fontSize: 12, color: '#666', lineHeight: 1.6,
                      padding: '8px 10px', background: '#f9f9f9', borderRadius: 4,
                      borderLeft: '3px solid #e51937',
                    }}>
                      MD가 강력 추천하는 도서입니다.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ========== 오늘의 특가 (Flash Sale with Countdown) ========== */}
        <section style={{ marginBottom: 40 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #e51937', paddingBottom: 10, marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e51937' }}>오늘의 특가</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{
                  display: 'inline-block', background: '#333', color: '#fff',
                  borderRadius: 4, padding: '4px 8px', fontSize: 16, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'center',
                }}>
                  {pad(countdown.hours)}
                </span>
                <span style={{ fontWeight: 700, color: '#333' }}>:</span>
                <span style={{
                  display: 'inline-block', background: '#333', color: '#fff',
                  borderRadius: 4, padding: '4px 8px', fontSize: 16, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'center',
                }}>
                  {pad(countdown.minutes)}
                </span>
                <span style={{ fontWeight: 700, color: '#333' }}>:</span>
                <span style={{
                  display: 'inline-block', background: '#333', color: '#fff',
                  borderRadius: 4, padding: '4px 8px', fontSize: 16, fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'center',
                }}>
                  {pad(countdown.seconds)}
                </span>
              </div>
              {/* Visual progress bar for 24h */}
              <div style={{
                width: 100, height: 6, background: '#eee', borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${((86400 - countdown.totalSeconds) / 86400) * 100}%`,
                  height: '100%', background: '#e51937', borderRadius: 3,
                  transition: 'width 1s linear',
                }} />
              </div>
            </div>
          </div>
          {flashSaleLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>불러오는 중...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 15 }}>
              {flashSaleItems.slice(0, 6).map(p => (
                <div key={p.id} style={{ position: 'relative' }}>
                  {/* Discount badge */}
                  {p.discount_rate > 0 && (
                    <div style={{
                      position: 'absolute', top: 6, left: 6, zIndex: 5,
                      background: '#e51937', color: '#fff', borderRadius: 4,
                      padding: '2px 6px', fontSize: 11, fontWeight: 700,
                    }}>
                      {p.discount_rate}% OFF
                    </div>
                  )}
                  {p.discount_rate === 0 && (
                    <div style={{
                      position: 'absolute', top: 6, left: 6, zIndex: 5,
                      background: '#ff6600', color: '#fff', borderRadius: 4,
                      padding: '2px 6px', fontSize: 11, fontWeight: 700,
                    }}>
                      특가
                    </div>
                  )}
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ========== 주목 신간 ========== */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>주목 신간</h2>
            <Link href="/Product/Category/NewProduct" style={{ fontSize: 12, color: '#999', textDecoration: 'none' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 15 }}>
            {newArrivals.slice(0, 6).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* ========== 화제의 신간 ========== */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>화제의 신간</h2>
            <Link href="/Product/Category/NewProduct" style={{ fontSize: 12, color: '#999', textDecoration: 'none' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15 }}>
            {newArrivals.slice(6, 11).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* ========== 스테디셀러 ========== */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>스테디셀러</h2>
            <Link href="/Product/Category/SteadySeller" style={{ fontSize: 12, color: '#999', textDecoration: 'none' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15 }}>
            {steady.slice(0, 5).map((p, i) => (
              <ProductCard key={p.id} product={p} rank={i + 1} />
            ))}
          </div>
        </section>

        {/* ========== 이벤트/기획전 ========== */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>이벤트/기획전</h2>
            <Link href="/event/List" style={{ fontSize: 12, color: '#999', textDecoration: 'none' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15 }}>
            {[
              { title: '2026 상반기 베스트셀러', period: '2026.01.01 ~ 2026.06.30', bg: '#e3f2fd' },
              { title: '봄맞이 도서 특가전', period: '2026.03.01 ~ 2026.04.30', bg: '#fce4ec' },
              { title: '신간 알리미 이벤트', period: '2026.03.15 ~ 2026.05.15', bg: '#e8f5e9' },
            ].map((evt, i) => (
              <Link key={i} href="/event/List" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: evt.bg, borderRadius: 6, padding: '30px 20px', textAlign: 'center', transition: 'transform 0.2s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = ''; }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 8 }}>{evt.title}</div>
                  <div style={{ fontSize: 12, color: '#999' }}>{evt.period}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
