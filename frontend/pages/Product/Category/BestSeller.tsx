import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, PaginatedResponse } from '@/lib/types';
import { getImageUrl } from '@/lib/constants';
import { getCoverUrl } from '@/lib/api';
import Pagination from '@/components/common/Pagination';

const CATEGORY_TABS = [
  { code: '', label: '종합' },
  { code: '001', label: '국내도서' },
  { code: '002', label: '외국도서' },
  { code: '005', label: 'eBook' },
  { code: '003', label: '음반' },
  { code: '004', label: 'DVD' },
  { code: '006', label: '문구' },
];

const PERIOD_TABS = [
  { key: 'weekly', label: '주간 베스트' },
  { key: 'monthly', label: '월간 베스트' },
];

function Stars({ rating, size = 11 }: { rating: number; size?: number }) {
  const full = Math.round(Number(rating));
  return (
    <span style={{ color: '#ffb800', fontSize: size, letterSpacing: -1 }}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)}
    </span>
  );
}

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

interface Props {
  bestsellers: PaginatedResponse<Product>;
  categoryCode: string;
  page: number;
  size: number;
  period: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const categoryCode = (ctx.query.CategoryNumber as string) || (ctx.query.category as string) || '';
  const page = parseInt(ctx.query.page as string) || 1;
  const size = parseInt(ctx.query.pageSize as string) || 24;
  const period = (ctx.query.period as string) || 'weekly';

  try {
    const bestsellers = await apiFetch<PaginatedResponse<Product>>(
      `/products/bestseller?page=${page}&size=${size}${categoryCode ? `&category_code=${categoryCode}` : ''}`,
      { isServer: true }
    );
    return { props: { bestsellers, categoryCode, page, size, period } };
  } catch {
    return {
      props: {
        bestsellers: { items: [], total: 0, page: 1, size: 24, pages: 0 },
        categoryCode: '', page: 1, size: 24, period: 'weekly',
      },
    };
  }
};

export default function BestSellerPage({ bestsellers, categoryCode, page, size, period }: Props) {
  const router = useRouter();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const navigate = (params: Record<string, string>) => {
    router.push({ pathname: router.pathname, query: { ...router.query, ...params } });
  };

  const parseRankChange = (rc: string | undefined) => {
    if (!rc || rc === '-') return { type: 'same', value: 0 };
    if (rc === 'NEW') return { type: 'new', value: 0 };
    if (rc.startsWith('+')) return { type: 'up', value: parseInt(rc.slice(1)) };
    if (rc.startsWith('-')) return { type: 'down', value: parseInt(rc.slice(1)) };
    return { type: 'same', value: 0 };
  };

  return (
    <>
      <Head><title>베스트셀러 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link>
          <span className="ico_arr">&gt;</span>
          <span>베스트셀러</span>
          {categoryCode && (
            <>
              <span className="ico_arr">&gt;</span>
              <span style={{ color: '#333' }}>{CATEGORY_TABS.find(c => c.code === categoryCode)?.label || '전체'}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 0 }}>
          베스트셀러
        </h2>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ebebeb', marginBottom: 0 }}>
          {CATEGORY_TABS.map(cat => (
            <button
              key={cat.code}
              onClick={() => navigate({ CategoryNumber: cat.code, page: '1' })}
              style={{
                padding: '10px 16px', fontSize: 13, border: 'none', cursor: 'pointer',
                background: categoryCode === cat.code ? '#333' : 'transparent',
                color: categoryCode === cat.code ? '#fff' : '#666',
                fontWeight: categoryCode === cat.code ? 700 : 400,
                borderRadius: categoryCode === cat.code ? '3px 3px 0 0' : 0,
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Period Toggle */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 0', borderBottom: '1px solid #ebebeb', marginBottom: 15,
        }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {PERIOD_TABS.map(p => (
              <button
                key={p.key}
                onClick={() => navigate({ period: p.key, page: '1' })}
                style={{
                  padding: '6px 16px', fontSize: 12, border: '1px solid',
                  borderColor: period === p.key ? '#0080ff' : '#d8d8d8',
                  background: period === p.key ? '#e5f2ff' : '#fff',
                  color: period === p.key ? '#0080ff' : '#666',
                  cursor: 'pointer', borderRadius: 20, fontWeight: period === p.key ? 700 : 400,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#999' }}>
              {(period === 'monthly' ? monthAgo : weekAgo).toLocaleDateString('ko-KR')} ~ {now.toLocaleDateString('ko-KR')} 기준
            </span>
            <select className="yesSelNor" onChange={e => navigate({ pageSize: e.target.value, page: '1' })} value={size}>
              <option value="24">24개씩</option>
              <option value="40">40개씩</option>
              <option value="80">80개씩</option>
            </select>
          </div>
        </div>

        {/* Bestseller List */}
        {bestsellers.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
            베스트셀러 목록이 없습니다.
          </div>
        ) : (
          <div>
            {bestsellers.items.map((product, i) => {
              const rank = (page - 1) * size + i + 1;
              const isTop3 = rank <= 3;
              const rankChange = parseRankChange((product as any).rank_change);
              const rankColor = RANK_COLORS[rank];

              return (
                <div
                  key={product.id}
                  style={{
                    display: 'flex', gap: 16, padding: '16px 0',
                    borderBottom: '1px solid #ebebeb',
                    background: isTop3 ? 'linear-gradient(90deg, #fffdf0 0%, #fff 40%)' : 'transparent',
                    paddingLeft: isTop3 ? 12 : 0,
                    marginLeft: isTop3 ? -12 : 0,
                    marginRight: isTop3 ? -12 : 0,
                    paddingRight: isTop3 ? 12 : 0,
                    borderRadius: isTop3 ? 4 : 0,
                  }}
                >
                  {/* Rank number */}
                  <div style={{ width: 50, flexShrink: 0, textAlign: 'center', paddingTop: 4 }}>
                    <div style={{
                      fontSize: isTop3 ? 28 : 18,
                      fontWeight: 900,
                      color: rankColor || (rank <= 10 ? '#333' : '#999'),
                      lineHeight: 1,
                    }}>
                      {rank}
                    </div>
                    {/* Rank change indicator */}
                    <div style={{ fontSize: 10, marginTop: 4 }}>
                      {rankChange.type === 'up' && <span style={{ color: '#e51937' }}>▲{rankChange.value}</span>}
                      {rankChange.type === 'down' && <span style={{ color: '#0080ff' }}>▼{rankChange.value}</span>}
                      {rankChange.type === 'new' && <span style={{ color: '#e51937', fontWeight: 700 }}>NEW</span>}
                      {rankChange.type === 'same' && <span style={{ color: '#999' }}>-</span>}
                    </div>
                  </div>

                  {/* Cover */}
                  <Link href={`/Product/Goods/${product.goods_no}`} style={{ flexShrink: 0 }}>
                    <div style={{
                      width: isTop3 ? 100 : 75, position: 'relative',
                      border: '1px solid #ebebeb',
                    }}>
                      <img src={getCoverUrl(product.cover_image, product.goods_no)} alt={product.title} style={{ width: '100%', display: 'block' }} loading="lazy" />
                      {isTop3 && rankColor && (
                        <div style={{
                          position: 'absolute', top: -4, left: -4,
                          width: 24, height: 24, borderRadius: '50%',
                          background: rankColor, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 900, boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                        }}>
                          {rank}
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/Product/Goods/${product.goods_no}`} style={{
                      fontSize: isTop3 ? 15 : 13, fontWeight: 500, color: '#333',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', lineHeight: 1.4, marginBottom: 4,
                    }}>
                      {product.title}
                    </Link>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>
                      <Link href={`/Author/${encodeURIComponent(product.author)}`} style={{ color: '#666' }}>{product.author}</Link>
                      <span style={{ margin: '0 6px', color: '#ddd' }}>|</span>
                      <Link href={`/Publisher/${encodeURIComponent(product.publisher)}`} style={{ color: '#666' }}>{product.publisher}</Link>
                      {product.publish_date && (
                        <><span style={{ margin: '0 6px', color: '#ddd' }}>|</span><span>{product.publish_date}</span></>
                      )}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      {product.discount_rate > 0 && (
                        <span style={{ color: '#ff6666', fontWeight: 700, fontSize: 13, marginRight: 4 }}>{product.discount_rate}%</span>
                      )}
                      <strong style={{ fontSize: isTop3 ? 16 : 14, color: '#333' }}>
                        {product.sale_price.toLocaleString()}
                      </strong>
                      <span style={{ fontSize: 13 }}>원</span>
                      {product.discount_rate > 0 && (
                        <span style={{ fontSize: 11, color: '#999', textDecoration: 'line-through', marginLeft: 6 }}>
                          {product.original_price.toLocaleString()}원
                        </span>
                      )}
                    </div>
                    {product.review_count > 0 && (
                      <div style={{ fontSize: 11, color: '#999' }}>
                        <Stars rating={Number(product.rating_avg)} />
                        <span style={{ marginLeft: 4 }}>{Number(product.rating_avg).toFixed(1)}</span>
                        <span style={{ marginLeft: 4 }}>({product.review_count})</span>
                        <span style={{ marginLeft: 10 }}>판매지수 {product.sales_index.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          page={page}
          pages={bestsellers.pages}
          baseUrl={`/Product/Category/BestSeller?${categoryCode ? `CategoryNumber=${categoryCode}&` : ''}pageSize=${size}&period=${period}`}
        />
      </div>
    </>
  );
}
