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
];

function Stars({ rating }: { rating: number }) {
  const full = Math.round(Number(rating));
  return <span style={{ color: '#ffb800', fontSize: 11, letterSpacing: -1 }}>{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>;
}

interface Props {
  products: PaginatedResponse<Product>;
  categoryCode: string;
  page: number;
  period: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const categoryCode = (ctx.query.category as string) || '';
  const page = parseInt(ctx.query.page as string) || 1;
  const period = (ctx.query.period as string) || 'weekly';

  try {
    const products = await apiFetch<PaginatedResponse<Product>>(
      `/products?page=${page}&size=24&sort=newest${categoryCode ? `&categoryCode=${categoryCode}` : ''}`,
      { isServer: true }
    );
    return { props: { products, categoryCode, page, period } };
  } catch {
    return { props: { products: { items: [], total: 0, page: 1, size: 24, pages: 0 }, categoryCode: '', page: 1, period: 'weekly' } };
  }
};

export default function NewProductPage({ products, categoryCode, page, period }: Props) {
  const router = useRouter();
  const navigate = (params: Record<string, string>) => {
    router.push({ pathname: router.pathname, query: { ...router.query, ...params } });
  };

  return (
    <>
      <Head><title>신간 베스트 - YES24</title></Head>
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">홈</Link><span className="ico_arr">&gt;</span><span>신간 베스트</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 0 }}>
          신간 베스트
        </h2>

        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #ebebeb', marginBottom: 0 }}>
          {CATEGORY_TABS.map(cat => (
            <button key={cat.code} onClick={() => navigate({ category: cat.code, page: '1' })}
              style={{ padding: '10px 16px', fontSize: 13, border: 'none', cursor: 'pointer', background: categoryCode === cat.code ? '#333' : 'transparent', color: categoryCode === cat.code ? '#fff' : '#666', fontWeight: categoryCode === cat.code ? 700 : 400, borderRadius: categoryCode === cat.code ? '3px 3px 0 0' : 0 }}>
              {cat.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #ebebeb', marginBottom: 15 }}>
          <div style={{ display: 'flex', gap: 2 }}>
            {[{ key: 'weekly', label: '이번 주' }, { key: 'monthly', label: '이번 달' }].map(p => (
              <button key={p.key} onClick={() => navigate({ period: p.key, page: '1' })}
                style={{ padding: '6px 16px', fontSize: 12, border: '1px solid', borderColor: period === p.key ? '#0080ff' : '#d8d8d8', background: period === p.key ? '#e5f2ff' : '#fff', color: period === p.key ? '#0080ff' : '#666', cursor: 'pointer', borderRadius: 20, fontWeight: period === p.key ? 700 : 400 }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {products.items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>신간 목록이 없습니다.</div>
        ) : (
          <div>
            {products.items.map((product, i) => {
              const rank = (page - 1) * 24 + i + 1;
              const isTop3 = rank <= 3;
              return (
                <div key={product.id} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid #ebebeb', background: isTop3 ? 'linear-gradient(90deg, #f0f7ff 0%, #fff 40%)' : 'transparent' }}>
                  <div style={{ width: 40, flexShrink: 0, textAlign: 'center', paddingTop: 4 }}>
                    <div style={{ fontSize: isTop3 ? 24 : 16, fontWeight: 900, color: isTop3 ? '#0080ff' : '#999' }}>{rank}</div>
                    <div style={{ fontSize: 10, color: '#e51937', fontWeight: 700 }}>NEW</div>
                  </div>
                  <Link href={`/Product/Goods/${product.goods_no}`} style={{ flexShrink: 0 }}>
                    <img src={getCoverUrl(product.cover_image, product.goods_no)} alt={product.title} style={{ width: isTop3 ? 90 : 70, border: '1px solid #ebebeb', display: 'block' }} loading="lazy" />
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/Product/Goods/${product.goods_no}`} style={{ fontSize: isTop3 ? 15 : 13, fontWeight: 500, color: '#333', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4, marginBottom: 4 }}>
                      {product.title}
                    </Link>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>
                      {product.author} | {product.publisher} {product.publish_date && `| ${product.publish_date}`}
                    </div>
                    <div>
                      {product.discount_rate > 0 && <span style={{ color: '#ff6666', fontWeight: 700, marginRight: 4 }}>{product.discount_rate}%</span>}
                      <strong style={{ fontSize: 14 }}>{product.sale_price.toLocaleString()}</strong><span>원</span>
                    </div>
                    {product.review_count > 0 && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                        <Stars rating={Number(product.rating_avg)} /> {Number(product.rating_avg).toFixed(1)} ({product.review_count})
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <Pagination page={page} pages={products.pages} baseUrl={`/Product/Category/NewProduct?category=${categoryCode}&period=${period}`} />
      </div>
    </>
  );
}
