import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';

const SORT_OPTIONS = [
  { value: 'newest', label: '최신순' },
  { value: 'sales', label: '판매량순' },
  { value: 'price_asc', label: '낮은가격순' },
  { value: 'price_desc', label: '높은가격순' },
];

interface Props {
  author: string;
  products: PaginatedResponse<Product>;
  page: number;
  sort: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const name = ctx.params?.name as string;
  const author = decodeURIComponent(name);
  const page = parseInt(ctx.query.page as string) || 1;
  const sort = (ctx.query.sort as string) || 'newest';

  try {
    const products = await apiFetch<PaginatedResponse<Product>>(
      `/products/by-author?author=${encodeURIComponent(author)}&page=${page}&size=24&sort=${sort}`,
      { isServer: true }
    );
    return { props: { author, products, page, sort } };
  } catch {
    return {
      props: {
        author,
        products: { items: [], total: 0, page: 1, size: 24, pages: 0 },
        page: 1,
        sort: 'newest',
      },
    };
  }
};

export default function AuthorPage({ author, products, page, sort }: Props) {
  const router = useRouter();

  const handleSort = (newSort: string) => {
    router.push({
      pathname: router.pathname,
      query: { ...router.query, sort: newSort, page: '1' },
    });
  };

  return (
    <>
      <Head><title>{author} - 저자/작가 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link>
          <span className="ico_arr">&gt;</span>
          <span>저자/작가</span>
          <span className="ico_arr">&gt;</span>
          <span style={{ color: '#333' }}>{author}</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        {/* Author Header */}
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #333' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: '#333', marginBottom: 8 }}>
            {author}
          </h2>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: '#f0f0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, color: '#999', flexShrink: 0,
            }}>
              {author.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#333', marginBottom: 6 }}>저자 소개</h3>
              <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7 }}>
                {author} 저자의 작품을 YES24에서 만나보세요.
                총 <strong style={{ color: '#0080ff' }}>{products.total}</strong>건의 도서가 등록되어 있습니다.
              </p>
            </div>
          </div>
        </div>

        {/* Sort + Count */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid #ebebeb',
        }}>
          <span style={{ fontSize: 13, color: '#333' }}>
            총 <strong>{products.total}</strong>건
          </span>
          <div style={{ display: 'flex', gap: 2 }}>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSort(opt.value)}
                style={{
                  padding: '5px 14px', fontSize: 12, border: '1px solid #d8d8d8',
                  background: sort === opt.value ? '#333' : '#fff',
                  color: sort === opt.value ? '#fff' : '#666',
                  cursor: 'pointer', borderRadius: 2,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {products.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            해당 저자의 도서가 없습니다.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {products.items.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 30, marginBottom: 40 }}>
          <Pagination
            page={page}
            pages={products.pages}
            baseUrl={`/Author/${encodeURIComponent(author)}?sort=${sort}`}
          />
        </div>
      </div>
    </>
  );
}
