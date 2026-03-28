import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse, Category } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';

const TABS = [
  { key: 'bestseller', label: '종합' },
  { key: 'realtime', label: '실시간' },
  { key: 'hotprice', label: '특가' },
  { key: 'daily', label: '일별' },
  { key: 'weekly', label: '주별' },
  { key: 'monthly', label: '월별' },
  { key: 'steady', label: '스테디셀러' },
];

const SIDEBAR_CATS = [
  { code: '001', name: '국내도서 종합' },
  { code: '002', name: '외국도서' },
  { code: '005', name: 'eBook' },
  { code: '003', name: 'CD/LP' },
  { code: '004', name: 'DVD/BD' },
  { code: '006', name: '문구/GIFT' },
  { code: '008', name: '티켓' },
];

interface Props {
  bestsellers: PaginatedResponse<Product>;
  categoryCode: string;
  page: number;
  size: number;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const categoryCode = (ctx.query.CategoryNumber as string) || (ctx.query.category as string) || '';
  const page = parseInt(ctx.query.page as string) || 1;
  const size = parseInt(ctx.query.pageSize as string) || 24;

  try {
    const bestsellers = await apiFetch<PaginatedResponse<Product>>(
      `/products/bestseller?page=${page}&size=${size}${categoryCode ? `&category_code=${categoryCode}` : ''}`,
      { isServer: true }
    );
    return { props: { bestsellers, categoryCode, page, size } };
  } catch {
    return {
      props: {
        bestsellers: { items: [], total: 0, page: 1, size: 24, pages: 0 },
        categoryCode: '', page: 1, size: 24,
      },
    };
  }
};

export default function BestSellerPage({ bestsellers, categoryCode, page, size }: Props) {
  const router = useRouter();
  const currentPeriod = (router.query.period as string) || 'bestseller';
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const navigate = (params: Record<string, string>) => {
    router.push({ pathname: router.pathname, query: { ...router.query, ...params } });
  };

  const handleTabClick = (tabKey: string) => {
    if (tabKey === 'steady') {
      router.push('/Product/Category/SteadySeller');
    } else {
      navigate({ period: tabKey, page: '1' });
    }
  };

  return (
    <>
      <Head><title>베스트셀러 - YES24</title></Head>

      {/* Breadcrumb */}
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>베스트셀러</span>
          {categoryCode && (
            <>
              <span className="ico_arr">&gt;</span>
              <span style={{ color: '#333' }}>{SIDEBAR_CATS.find(c => c.code === categoryCode)?.name || '전체'}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 30, paddingTop: 10 }}>
        {/* Left Sidebar */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#333', paddingBottom: 10, borderBottom: '2px solid #333', marginBottom: 10 }}>
            베스트셀러
          </h2>
          <ul style={{ listStyle: 'none' }}>
            {SIDEBAR_CATS.map(cat => (
              <li key={cat.code} style={{ borderBottom: '1px solid #ebebeb' }}>
                <Link
                  href={`/Product/Category/BestSeller?CategoryNumber=${cat.code}`}
                  style={{
                    display: 'block', padding: '9px 0', fontSize: 13,
                    color: categoryCode === cat.code ? '#0080ff' : '#333',
                    fontWeight: categoryCode === cat.code ? 700 : 400,
                    textDecoration: 'none',
                  }}
                >
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Period Tabs */}
          <div className="yesTab_nor yesTab_black" style={{ marginBottom: 20 }}>
            <ul style={{ display: 'flex' }}>
              {TABS.map((tab) => {
                const isActive = tab.key === currentPeriod;
                return (
                  <li key={tab.key} className={isActive ? 'on' : ''} style={{ flex: 1 }}>
                    <a
                      href="#"
                      onClick={(e) => { e.preventDefault(); handleTabClick(tab.key); }}
                      style={{
                        display: 'block', padding: '10px 0', textAlign: 'center',
                        fontSize: 13, background: isActive ? '#333' : '#f8f8f8',
                        color: isActive ? '#fff' : '#333',
                        fontWeight: isActive ? 700 : 400,
                        border: '1px solid #d8d8d8', borderBottom: 'none', marginRight: -1,
                        textDecoration: 'none',
                      }}
                    >
                      {tab.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Date range + controls */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0', borderBottom: '1px solid #ebebeb', marginBottom: 15,
          }}>
            <span style={{ fontSize: 11, color: '#999' }}>
              {weekAgo.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              {' ~ '}
              {now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })} 기준
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select className="yesSelNor" onChange={(e) => navigate({ pageSize: e.target.value, page: '1' })} value={size}>
                <option value="24">24개씩 보기</option>
                <option value="40">40개씩 보기</option>
                <option value="80">80개씩 보기</option>
                <option value="120">120개씩 보기</option>
              </select>
            </div>
          </div>

          {/* Product List */}
          <ul className="sGLi tp_book tp_list" style={{ listStyle: 'none' }}>
            {bestsellers.items.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                rank={(page - 1) * size + i + 1}
                listView
              />
            ))}
          </ul>

          {bestsellers.items.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
              베스트셀러 목록이 없습니다.
            </div>
          )}

          <Pagination
            page={page}
            pages={bestsellers.pages}
            baseUrl={`/Product/Category/BestSeller?${categoryCode ? `CategoryNumber=${categoryCode}&` : ''}pageSize=${size}`}
          />
        </div>
      </div>
    </>
  );
}
