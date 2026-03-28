import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';

const SORT_OPTS = [
  { value: 'relevance', label: '정확도순' },
  { value: 'popularity', label: '인기순' },
  { value: 'newest', label: '신상품순' },
  { value: 'price_asc', label: '낮은가격순' },
  { value: 'price_desc', label: '높은가격순' },
];

const DOMAIN_OPTS = [
  { value: 'ALL', label: '전체' },
  { value: 'BOOK', label: '국내도서' },
  { value: 'FOREIGN', label: '외국도서' },
  { value: 'EBOOK', label: 'eBook' },
  { value: 'MUSIC', label: '음반' },
  { value: 'DVD', label: 'DVD' },
];

interface Props {
  results: PaginatedResponse<Product>;
  query: string;
  sort: string;
  page: number;
  domain: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const query = (ctx.query.query as string) || '';
  const page = parseInt(ctx.query.page as string) || 1;
  const sort = (ctx.query.sort as string) || 'relevance';
  const domain = (ctx.query.domain as string) || 'ALL';

  if (!query) {
    return { props: { results: { items: [], total: 0, page: 1, size: 24, pages: 0 }, query: '', sort, page: 1, domain } };
  }

  try {
    const results = await apiFetch<PaginatedResponse<Product>>(
      `/search?query=${encodeURIComponent(query)}&page=${page}&size=24&sort=${sort}`,
      { isServer: true }
    );
    return { props: { results, query, sort, page, domain } };
  } catch {
    return { props: { results: { items: [], total: 0, page: 1, size: 24, pages: 0 }, query, sort, page, domain } };
  }
};

export default function SearchPage({ results, query, sort, page, domain }: Props) {
  const router = useRouter();

  return (
    <>
      <Head><title>{query ? `'${query}' 검색결과` : '검색'} - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>검색결과</span>
          {query && <><span className="ico_arr">&gt;</span><span style={{ color: '#333' }}>{query}</span></>}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 10 }}>
        {/* Search result header */}
        <div style={{ paddingBottom: 15, borderBottom: '2px solid #333', marginBottom: 15 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#333' }}>
            {query ? (
              <>
                &lsquo;<span style={{ color: '#0080ff' }}>{query}</span>&rsquo; 검색결과
                <span style={{ fontSize: 13, fontWeight: 400, color: '#999', marginLeft: 8 }}>
                  ({results.total.toLocaleString()}건)
                </span>
              </>
            ) : '검색어를 입력해 주세요'}
          </h2>
        </div>

        {query && (
          <>
            {/* Domain tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 15, borderBottom: '1px solid #d8d8d8' }}>
              {DOMAIN_OPTS.map(d => (
                <button
                  key={d.value}
                  onClick={() => router.push({ pathname: '/Product/Search', query: { ...router.query, domain: d.value, page: '1' } })}
                  style={{
                    padding: '8px 16px', fontSize: 12, border: 'none', cursor: 'pointer',
                    background: domain === d.value ? '#333' : 'transparent',
                    color: domain === d.value ? '#fff' : '#666',
                    fontWeight: domain === d.value ? 700 : 400,
                    borderRadius: '3px 3px 0 0',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Sort bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 15, alignItems: 'center' }}>
              {SORT_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => router.push({ pathname: '/Product/Search', query: { ...router.query, sort: opt.value, page: '1' } })}
                  style={{
                    background: 'none', border: 'none', padding: '4px 8px', cursor: 'pointer',
                    fontSize: 12, color: sort === opt.value ? '#0080ff' : '#666',
                    fontWeight: sort === opt.value ? 700 : 400,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Results */}
            {results.items.length > 0 ? (
              <ul className="sGLi tp_book tp_list" style={{ listStyle: 'none' }}>
                {results.items.map(product => (
                  <ProductCard key={product.id} product={product} listView />
                ))}
              </ul>
            ) : (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <p style={{ fontSize: 14, color: '#333', marginBottom: 8 }}>검색 결과가 없습니다.</p>
                <p style={{ fontSize: 12, color: '#999' }}>검색어의 철자가 정확한지 확인해 주세요.</p>
              </div>
            )}

            <Pagination
              page={page}
              pages={results.pages}
              baseUrl={`/Product/Search?query=${encodeURIComponent(query)}&sort=${sort}&domain=${domain}`}
            />
          </>
        )}
      </div>
    </>
  );
}
