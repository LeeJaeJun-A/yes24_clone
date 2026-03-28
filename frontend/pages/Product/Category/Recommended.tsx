import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';

interface Props {
  products: PaginatedResponse<Product>;
  page: number;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const page = parseInt(ctx.query.page as string) || 1;

  try {
    // recommended returns a list, wrap it as paginated
    const items = await apiFetch<Product[]>(
      `/products/recommended?limit=48`,
      { isServer: true }
    );
    const products: PaginatedResponse<Product> = {
      items: items || [],
      total: items?.length || 0,
      page: 1,
      size: 48,
      pages: 1,
    };
    return { props: { products, page } };
  } catch {
    return {
      props: {
        products: { items: [], total: 0, page: 1, size: 48, pages: 0 },
        page: 1,
      },
    };
  }
};

export default function RecommendedPage({ products, page }: Props) {
  return (
    <>
      <Head><title>YES24의 선택 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>YES24의 선택</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 20 }}>
          YES24의 선택
        </h2>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 24 }}>
          YES24 에디터가 엄선한 추천 도서를 만나보세요.
        </p>

        {/* 4-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 24,
        }}>
          {products.items.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.items.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            추천 도서 목록이 없습니다.
          </div>
        )}

        <div style={{ marginTop: 30, marginBottom: 40 }}>
          <Pagination
            page={page}
            pages={products.pages}
            baseUrl="/Product/Category/Recommended"
          />
        </div>
      </div>
    </>
  );
}
