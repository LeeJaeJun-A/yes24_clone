import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse } from '@/lib/types';
import { PAGE_SIZES } from '@/lib/constants';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';

const SUGGESTED_TERMS = ['소설', '에세이', '자기계발', '역사', '경제', '과학', '컴퓨터', '요리', '여행', '만화'];

const SORT_OPTS = [
  { value: 'popularity', label: '인기도순' },
  { value: 'relevance', label: '정확도순' },
  { value: 'newest', label: '신상품순' },
  { value: 'price_asc', label: '최저가순' },
  { value: 'price_desc', label: '최고가순' },
  { value: 'rating', label: '평점순' },
];

const DOMAIN_OPTS = [
  { value: 'ALL', label: '전체' },
  { value: 'BOOK', label: '국내도서' },
  { value: 'FOREIGN', label: '외국도서' },
  { value: 'EBOOK', label: 'eBook' },
  { value: 'MUSIC', label: '음반' },
  { value: 'DVD', label: 'DVD' },
];

interface Facet { name?: string; code?: string; count: number; }
interface Facets { publishers: Facet[]; categories: Facet[]; }

interface Props {
  results: PaginatedResponse<Product>;
  query: string;
  sort: string;
  page: number;
  domain: string;
  size: number;
  view: string;
  facets: Facets | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const query = (ctx.query.query as string) || '';
  const page = parseInt(ctx.query.page as string) || 1;
  const size = parseInt(ctx.query.size as string) || 24;
  const sort = (ctx.query.sort as string) || 'relevance';
  const domain = (ctx.query.domain as string) || 'ALL';
  const view = (ctx.query.view as string) || 'list';

  if (!query) {
    return { props: { results: { items: [], total: 0, page: 1, size: 24, pages: 0 }, query: '', sort, page: 1, domain, size: 24, view, facets: null } };
  }

  try {
    const results = await apiFetch<PaginatedResponse<Product>>(
      `/search?query=${encodeURIComponent(query)}&page=${page}&size=${size}&sort=${sort}`,
      { isServer: true }
    );
    const facets = results.meta?.facets || null;
    return { props: { results, query, sort, page, domain, size, view, facets } };
  } catch {
    return { props: { results: { items: [], total: 0, page: 1, size: 24, pages: 0 }, query, sort, page, domain, size, view, facets: null } };
  }
};

export default function SearchPage({ results, query, sort, page, domain, size, view, facets }: Props) {
  const router = useRouter();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('yes24_recent_searches') || '[]');
      setRecentSearches(Array.isArray(stored) ? stored.slice(0, 10) : []);
    } catch { setRecentSearches([]); }
  }, []);

  useEffect(() => {
    if (query) {
      try {
        const stored: string[] = JSON.parse(localStorage.getItem('yes24_recent_searches') || '[]');
        const updated = [query, ...stored.filter(s => s !== query)].slice(0, 10);
        localStorage.setItem('yes24_recent_searches', JSON.stringify(updated));
      } catch {}
    }
  }, [query]);

  const updateQuery = (params: Record<string, string>) => {
    router.push({ pathname: '/Product/Search', query: { ...router.query, ...params } });
  };

  const resetFilters = () => {
    router.push({ pathname: '/Product/Search', query: { query, sort: 'relevance', domain: 'ALL', page: '1', size: String(size), view } });
  };

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

            <div style={{ display: 'flex', gap: 25 }}>
              {/* Left Filter Sidebar */}
              <div style={{ width: 180, flexShrink: 0 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '2px solid #333', marginBottom: 10 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', margin: 0 }}>검색 필터</h4>
                    <button
                      onClick={resetFilters}
                      style={{ background: 'none', border: '1px solid #d8d8d8', borderRadius: 3, padding: '2px 8px', fontSize: 11, color: '#666', cursor: 'pointer' }}
                    >
                      필터 초기화
                    </button>
                  </div>
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>가격</div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="number" placeholder="최소" style={{ width: '100%', padding: '4px 6px', border: '1px solid #d8d8d8', fontSize: 11 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value; updateQuery({ minPrice: val, page: '1' }); } }} />
                      <span style={{ fontSize: 11, color: '#999' }}>~</span>
                      <input type="number" placeholder="최대" style={{ width: '100%', padding: '4px 6px', border: '1px solid #d8d8d8', fontSize: 11 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { const val = (e.target as HTMLInputElement).value; updateQuery({ maxPrice: val, page: '1' }); } }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>가격대</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {[
                        { label: '1만원 이하', min: 0, max: 10000 },
                        { label: '1-2만원', min: 10000, max: 20000 },
                        { label: '2-3만원', min: 20000, max: 30000 },
                        { label: '3만원 이상', min: 30000, max: null as number | null },
                      ].map((r, i) => {
                        const currentMin = router.query.minPrice;
                        const currentMax = router.query.maxPrice;
                        const isActive = currentMin === String(r.min) && (r.max ? currentMax === String(r.max) : !currentMax);
                        return (
                          <button
                            key={i}
                            onClick={() => updateQuery({ minPrice: String(r.min), maxPrice: r.max ? String(r.max) : '', page: '1' })}
                            style={{
                              padding: '4px 8px', fontSize: 11, borderRadius: 3, cursor: 'pointer',
                              border: isActive ? '1px solid #0080ff' : '1px solid #d8d8d8',
                              background: isActive ? '#e8f4ff' : '#fff',
                              color: isActive ? '#0080ff' : '#666',
                              fontWeight: isActive ? 600 : 400,
                            }}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {/* Rating filter */}
                  <div style={{ marginBottom: 15 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>평점</div>
                    {[
                      { label: '★4.0 이상', value: '4.0' },
                      { label: '★3.0 이상', value: '3.0' },
                    ].map(opt => {
                      const isActive = router.query.minRating === opt.value;
                      return (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, cursor: 'pointer', fontSize: 12, color: isActive ? '#0080ff' : '#666' }}>
                          <input
                            type="radio"
                            name="ratingFilter"
                            checked={isActive}
                            onChange={() => updateQuery({ minRating: opt.value, page: '1' })}
                            style={{ margin: 0 }}
                          />
                          {opt.label}
                        </label>
                      );
                    })}
                    {router.query.minRating && (
                      <button
                        onClick={() => { const q = { ...router.query }; delete q.minRating; q.page = '1'; router.push({ pathname: '/Product/Search', query: q }); }}
                        style={{ background: 'none', border: 'none', fontSize: 11, color: '#999', cursor: 'pointer', padding: 0, marginTop: 2 }}
                      >
                        평점 필터 해제
                      </button>
                    )}
                  </div>
                  {facets && facets.publishers.length > 0 && (
                    <div style={{ marginBottom: 15 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>출판사</div>
                      {facets.publishers.map((pub, i) => (
                        <div key={i} style={{ marginBottom: 3 }}>
                          <a href="#" onClick={(e) => { e.preventDefault(); updateQuery({ publisher: pub.name || '', page: '1' }); }}
                            style={{ fontSize: 12, color: '#666', textDecoration: 'none' }}>
                            {pub.name} <span style={{ color: '#999' }}>({pub.count})</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  {facets && facets.categories.length > 0 && (
                    <div style={{ marginBottom: 15 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#333', marginBottom: 6 }}>카테고리</div>
                      {facets.categories.map((cat, i) => (
                        <div key={i} style={{ marginBottom: 3 }}>
                          <a href="#" onClick={(e) => { e.preventDefault(); updateQuery({ category_code: cat.code || '', page: '1' }); }}
                            style={{ fontSize: 12, color: '#666', textDecoration: 'none' }}>
                            {cat.code} <span style={{ color: '#999' }}>({cat.count})</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ fontSize: 12, color: '#999', borderTop: '1px solid #ebebeb', paddingTop: 10 }}>
                    총 <strong style={{ color: '#0080ff' }}>{results.total.toLocaleString()}</strong>건
                  </div>
                </div>
              </div>

              {/* Main Results */}
              <div style={{ flex: 1 }}>
                {/* Sort bar + controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottom: '1px solid #d8d8d8', paddingBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                    {SORT_OPTS.map((opt, i) => (
                      <button
                        key={opt.value}
                        onClick={() => updateQuery({ sort: opt.value, page: '1' })}
                        style={{
                          background: 'none', border: 'none', padding: '4px 10px', cursor: 'pointer',
                          fontSize: 12, color: sort === opt.value ? '#0080ff' : '#666',
                          fontWeight: sort === opt.value ? 700 : 400,
                          borderRight: i < SORT_OPTS.length - 1 ? '1px solid #d8d8d8' : 'none',
                          lineHeight: '12px',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <span style={{ fontSize: 12, color: '#999', marginLeft: 10 }}>
                      총 <strong style={{ color: '#0080ff', fontWeight: 700 }}>{results.total.toLocaleString()}</strong>건
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select className="yesSelNor" value={size} onChange={(e) => updateQuery({ size: e.target.value, page: '1' })}
                      style={{ padding: '3px 6px', fontSize: 11, border: '1px solid #d8d8d8' }}>
                      {PAGE_SIZES.map(s => (
                        <option key={s} value={s}>{s}개씩</option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button
                        onClick={() => updateQuery({ view: 'grid' })}
                        style={{
                          width: 28, height: 28, border: '1px solid #d8d8d8', fontSize: 14,
                          background: view !== 'list' ? '#333' : '#fff', color: view !== 'list' ? '#fff' : '#333',
                          cursor: 'pointer',
                        }}
                      >&#9638;</button>
                      <button
                        onClick={() => updateQuery({ view: 'list' })}
                        style={{
                          width: 28, height: 28, border: '1px solid #d8d8d8', fontSize: 14,
                          background: view === 'list' ? '#333' : '#fff', color: view === 'list' ? '#fff' : '#333',
                          cursor: 'pointer',
                        }}
                      >&#9776;</button>
                    </div>
                  </div>
                </div>

                {/* Results */}
                {results.items.length > 0 ? (
                  view === 'list' ? (
                    <ul className="sGLi tp_book tp_list" style={{ listStyle: 'none' }}>
                      {results.items.map(product => (
                        <ProductCard key={product.id} product={product} listView />
                      ))}
                    </ul>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                      {results.items.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <p style={{ fontSize: 14, color: '#333', marginBottom: 8 }}>검색 결과가 없습니다.</p>
                    <p style={{ fontSize: 12, color: '#999', marginBottom: 24 }}>검색어의 철자가 정확한지 확인해 주세요.</p>

                    <div style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
                      <div style={{ marginBottom: 20 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #ebebeb' }}>
                          이런 검색어는 어떠세요?
                        </h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {SUGGESTED_TERMS.filter(t => t !== query).slice(0, 5).map(term => (
                            <Link key={term} href={`/Product/Search?query=${encodeURIComponent(term)}`}
                              style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #d8d8d8', borderRadius: 20, color: '#666', textDecoration: 'none', background: '#f9f9f9' }}>
                              {term}
                            </Link>
                          ))}
                        </div>
                      </div>

                      {recentSearches.length > 0 && (
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #ebebeb' }}>
                            최근 검색어
                          </h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {recentSearches.filter(s => s !== query).slice(0, 5).map(term => (
                              <Link key={term} href={`/Product/Search?query=${encodeURIComponent(term)}`}
                                style={{ padding: '4px 12px', fontSize: 12, border: '1px solid #d8d8d8', borderRadius: 20, color: '#0080ff', textDecoration: 'none', background: '#fff' }}>
                                {term}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Pagination
                  page={page}
                  pages={results.pages}
                  baseUrl={`/Product/Search?query=${encodeURIComponent(query)}&sort=${sort}&domain=${domain}&size=${size}&view=${view}`}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
