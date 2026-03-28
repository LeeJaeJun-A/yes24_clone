import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';

interface Props {
  publisher: string;
  products: PaginatedResponse<Product>;
  page: number;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const name = ctx.params?.name as string;
  const publisher = decodeURIComponent(name);
  const page = parseInt(ctx.query.page as string) || 1;

  try {
    const products = await apiFetch<PaginatedResponse<Product>>(
      `/products/by-publisher?publisher=${encodeURIComponent(publisher)}&page=${page}&size=24`,
      { isServer: true }
    );
    return { props: { publisher, products, page } };
  } catch {
    return {
      props: {
        publisher,
        products: { items: [], total: 0, page: 1, size: 24, pages: 0 },
        page: 1,
      },
    };
  }
};

export default function PublisherPage({ publisher, products, page }: Props) {
  return (
    <>
      <Head><title>{publisher} - 출판사 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>출판사</span>
          <span className="ico_arr">&gt;</span>
          <span style={{ color: '#333' }}>{publisher}</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 6 }}>
          {publisher}
        </h2>
        <p style={{ fontSize: 12, color: '#999', marginBottom: 24 }}>
          출판사 도서 {products.total > 0 ? `${products.total}건` : ''}
        </p>

        {products.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            해당 출판사의 도서가 없습니다.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
          }}>
            {products.items.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 30, marginBottom: 40 }}>
          <Pagination
            page={page}
            pages={products.pages}
            baseUrl={`/Publisher/${encodeURIComponent(publisher)}`}
          />
        </div>
      </div>
    </>
  );
}
