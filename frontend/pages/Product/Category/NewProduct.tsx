import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';
import { SORT_OPTIONS, PAGE_SIZES } from '@/lib/constants';

interface Props {
  products: PaginatedResponse<Product>;
  page: number;
  size: number;
  sort: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const page = parseInt(ctx.query.page as string) || 1;
  const size = parseInt(ctx.query.pageSize as string) || 24;
  const sort = (ctx.query.sort as string) || 'newest';

  try {
    // Use category products endpoint with newest sort for paginated results
    const products = await apiFetch<PaginatedResponse<Product>>(
      `/categories/001/products?page=${page}&size=${size}&sort=newest`,
      { isServer: true }
    );
    return { props: { products, page, size, sort } };
  } catch {
    return {
      props: {
        products: { items: [], total: 0, page: 1, size: 24, pages: 0 },
        page: 1, size: 24, sort: 'newest',
      },
    };
  }
};

export default function NewProductPage({ products, page, size, sort }: Props) {
  const router = useRouter();

  const navigate = (params: Record<string, string>) => {
    router.push({ pathname: router.pathname, query: { ...router.query, ...params } });
  };

  return (
    <>
      <Head><title>신간 도서 - YES24</title></Head>

      {/* Breadcrumb */}
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>신간 도서</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 20 }}>
          신간 도서
        </h2>

        {/* Sorting toolbar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 0', borderBottom: '1px solid #ebebeb', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {SORT_OPTIONS.map(opt => (
              <a
                key={opt.value}
                href="#"
                onClick={(e) => { e.preventDefault(); navigate({ sort: opt.value, page: '1' }); }}
                style={{
                  padding: '4px 10px', fontSize: 12,
                  color: sort === opt.value ? '#0080ff' : '#666',
                  fontWeight: sort === opt.value ? 700 : 400,
                  textDecoration: 'none',
                  borderRight: '1px solid #ddd',
                }}
              >
                {opt.label}
              </a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <select className="yesSelNor" onChange={(e) => navigate({ pageSize: e.target.value, page: '1' })} value={size}
              style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ccc' }}>
              {PAGE_SIZES.map(s => (
                <option key={s} value={s}>{s}개씩 보기</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 20,
        }}>
          {products.items.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            신간 도서 목록이 없습니다.
          </div>
        )}

        <div style={{ marginTop: 30, marginBottom: 40 }}>
          <Pagination
            page={page}
            pages={products.pages}
            baseUrl={`/Product/Category/NewProduct?sort=${sort}&pageSize=${size}`}
          />
        </div>
      </div>
    </>
  );
}
