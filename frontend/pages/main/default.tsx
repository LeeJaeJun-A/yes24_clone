import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Product, Banner, Category } from '@/lib/types';
import { getImageUrl, formatPrice } from '@/lib/constants';
import ProductCard from '@/components/common/ProductCard';

const BANNER_COLORS = ['#003466', '#1a3a5c', '#2c1654', '#0f3460', '#1e3a5f', '#3d1c56'];
const MAIN_CATS = [
  { code: '001', name: '국내도서' },
  { code: '002', name: '외국도서' },
  { code: '005', name: 'eBook' },
  { code: '003', name: 'CD/LP' },
  { code: '004', name: 'DVD/BD' },
  { code: '006', name: '문구/GIFT' },
  { code: '007', name: '중고샵' },
  { code: '008', name: '티켓' },
];

interface Props {
  bestsellers: Product[];
  newArrivals: Product[];
  recommended: Product[];
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  try {
    const [bestRes, newRes, recRes] = await Promise.all([
      apiFetch<any>('/products/bestseller?size=10', { isServer: true }),
      apiFetch<Product[]>('/products/new?limit=12', { isServer: true }),
      apiFetch<Product[]>('/products/recommended?limit=8', { isServer: true }),
    ]);
    return {
      props: {
        bestsellers: bestRes.items || [],
        newArrivals: newRes || [],
        recommended: recRes || [],
      },
    };
  } catch {
    return { props: { bestsellers: [], newArrivals: [], recommended: [] } };
  }
};

export default function HomePage({ bestsellers, newArrivals, recommended }: Props) {
  return (
    <>
      <Head>
        <title>YES24 - 대한민국 대표 인터넷서점</title>
        <meta property="og:title" content="YES24 - 대한민국 대표 인터넷서점" />
        <meta property="og:description" content="국내 최대의 인터넷쇼핑몰 YES24. 도서, 음반, DVD, 문구, 티켓 판매" />
      </Head>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        {/* Hero: Category Sidebar + Main Banner */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 30 }}>
          {/* Left Category Sidebar */}
          <div style={{ width: 180, flexShrink: 0, background: '#f8f8f8', borderRight: '1px solid #eee' }}>
            <div style={{ padding: '12px 0' }}>
              {MAIN_CATS.map(cat => (
                <Link
                  key={cat.code}
                  href={`/Product/Category/Display/${cat.code}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 15px', fontSize: 13, color: '#333',
                    fontWeight: 500, textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#0080ff'; (e.target as HTMLElement).style.color = '#fff'; }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.background = ''; (e.target as HTMLElement).style.color = '#333'; }}
                >
                  <span>{cat.name}</span>
                </Link>
              ))}
            </div>
          </div>
          {/* Main Banner Carousel */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <div id="heroSwiper" className="swiper" style={{ height: 420 }}>
              <div className="swiper-wrapper">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="swiper-slide">
                    <div style={{
                      height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(135deg, ${BANNER_COLORS[i % BANNER_COLORS.length]} 0%, ${BANNER_COLORS[(i + 1) % BANNER_COLORS.length]} 100%)`,
                      color: '#fff', padding: 40,
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 12 }}>YES24 추천 도서</div>
                        <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
                          {['이달의 베스트셀러', '신간 추천 컬렉션', '화제의 신간', 'MD가 선택한 책', '올해의 도서'][i - 1]}
                        </div>
                        <div style={{ fontSize: 14, opacity: 0.6 }}>지금 바로 만나보세요</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="swiper-pagination"></div>
              <div className="swiper-button-next"></div>
              <div className="swiper-button-prev"></div>
            </div>
          </div>
        </div>

        {/* Bestseller Section */}
        <section style={{ marginBottom: 40 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>베스트셀러</h2>
            <Link href="/Product/Category/BestSeller" style={{ fontSize: 12, color: '#999' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15 }}>
            {bestsellers.slice(0, 5).map((p, i) => (
              <ProductCard key={p.id} product={p} rank={i + 1} />
            ))}
          </div>
        </section>

        {/* New Arrivals */}
        <section style={{ marginBottom: 40 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>주목 신간</h2>
            <Link href="/Product/Category/NewProduct" style={{ fontSize: 12, color: '#999' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 15 }}>
            {newArrivals.slice(0, 6).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* MD Pick */}
        <section style={{ marginBottom: 40 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>YES24의 선택</h2>
            <Link href="/Product/Category/Recommended" style={{ fontSize: 12, color: '#999' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {recommended.slice(0, 4).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* More Bestsellers */}
        <section style={{ marginBottom: 40 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #333', paddingBottom: 10, marginBottom: 20,
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>화제의 신간</h2>
            <Link href="/Product/Category/NewProduct" style={{ fontSize: 12, color: '#999' }}>더보기 &gt;</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 15 }}>
            {bestsellers.slice(5, 10).map((p, i) => (
              <ProductCard key={p.id} product={p} rank={i + 6} />
            ))}
          </div>
        </section>

        {/* Swiper init */}
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function() {
            if (typeof Swiper !== 'undefined') {
              new Swiper('#heroSwiper', {
                loop: true, autoplay: { delay: 4000, disableOnInteraction: false },
                pagination: { el: '.swiper-pagination', clickable: true },
                navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                speed: 550,
              });
            }
          });
        `}} />
      </div>
    </>
  );
}
