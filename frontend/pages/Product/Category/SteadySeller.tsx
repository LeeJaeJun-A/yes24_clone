import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';

const CATEGORY_TABS = [
  { code: '', label: '종합' },
  { code: '001', label: '국내도서' },
  { code: '002', label: '외국도서' },
  { code: '005', label: 'eBook' },
];

interface Props {
  products: PaginatedResponse<Product>;
  categoryCode: string;
  page: number;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const categoryCode = (ctx.query.category as string) || '';
  const page = parseInt(ctx.query.page as string) || 1;
  try {
    const products = await apiFetch<PaginatedResponse<Product>>(
      `/products/steady?page=${page}&size=24${categoryCode ? `&category_code=${categoryCode}` : ''}`,
      { isServer: true }
    );
    return { props: { products, categoryCode, page } };
  } catch {
    return { props: { products: { items: [], total: 0, page: 1, size: 24, pages: 0 }, categoryCode: '', page: 1 } };
  }
};

export default function SteadySellerPage({ products, categoryCode, page }: Props) {
  const router = useRouter();
  const navigate = (params: Record<string, string>) => {
    router.push({ pathname: router.pathname, query: { ...router.query, ...params } });
  };

  return (
    <>
      <Head><title>스테디셀러 - YES24</title></Head>
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link><span className="ico_arr">&gt;</span><span>스테디셀러</span>
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 0 }}>
          스테디셀러
        </h2>
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ebebeb', marginBottom: 20 }}>
          {CATEGORY_TABS.map(cat => (
            <button key={cat.code} onClick={() => navigate({ category: cat.code, page: '1' })}
              style={{ padding: '10px 16px', fontSize: 13, border: 'none', cursor: 'pointer', background: categoryCode === cat.code ? '#333' : 'transparent', color: categoryCode === cat.code ? '#fff' : '#666', fontWeight: categoryCode === cat.code ? 700 : 400 }}>
              {cat.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#999', marginBottom: 20 }}>
          총 <strong style={{ color: '#333' }}>{products.total}</strong>건
        </p>
        {products.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>스테디셀러 목록이 없습니다.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 30 }}>
            {products.items.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
        <Pagination page={page} pages={products.pages} baseUrl={`/Product/Category/SteadySeller?category=${categoryCode}`} />
      </div>
    </>
  );
}
