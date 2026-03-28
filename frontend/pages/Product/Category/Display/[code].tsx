import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { Product, Category, PaginatedResponse } from '@/lib/types';
import { SORT_OPTIONS, PAGE_SIZES } from '@/lib/constants';
import ProductCard from '@/components/common/ProductCard';
import Pagination from '@/components/common/Pagination';

interface Props {
  category: Category | null;
  siblings: Category[];
  children: Category[];
  products: PaginatedResponse<Product>;
  parentName: string;
  code: string;
  sort: string;
  size: number;
  page: number;
  view: string;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const code = ctx.params?.code as string;
  const page = parseInt(ctx.query.page as string) || 1;
  const size = parseInt(ctx.query.size as string) || 24;
  const sort = (ctx.query.sort as string) || 'popularity';
  const view = (ctx.query.view as string) || 'grid';

  try {
    const [catTree, category, products] = await Promise.all([
      apiFetch<Category[]>('/categories', { isServer: true }),
      apiFetch<Category>(`/categories/${code}`, { isServer: true }).catch(() => null),
      apiFetch<PaginatedResponse<Product>>(
        `/categories/${code}/products?page=${page}&size=${size}&sort=${sort}`,
        { isServer: true }
      ),
    ]);

    const flat: Category[] = [];
    const flatten = (items: Category[]) => {
      for (const item of items) { flat.push(item); if (item.children) flatten(item.children); }
    };
    flatten(catTree);

    const parentCode = category?.parent_code || null;
    const siblings = flat.filter(c => c.parent_code === parentCode && c.depth === (category?.depth || 2));
    const children = flat.filter(c => c.parent_code === code);
    const parent = parentCode ? flat.find(c => c.code === parentCode) : null;

    return {
      props: { category, siblings, children, products, parentName: parent?.name_ko || '', code, sort, size, page, view },
    };
  } catch {
    return {
      props: {
        category: null, siblings: [], children: [],
        products: { items: [], total: 0, page: 1, size: 24, pages: 0 },
        parentName: '', code, sort: 'popularity', size: 24, page: 1, view: 'grid',
      },
    };
  }
};

export default function CategoryPage({ category, siblings, children, products, parentName, code, sort, size, page, view }: Props) {
  const router = useRouter();
  const updateQuery = (params: Record<string, string>) => {
    router.push({ pathname: router.pathname, query: { ...router.query, ...params } });
  };

  const sidebarCategories = children.length > 0 ? children : siblings;
  const sidebarTitle = category?.name_ko || '카테고리';

  return (
    <>
      <Head>
        <title>{category?.name_ko || '카테고리'} - YES24</title>
      </Head>

      {/* Breadcrumb */}
      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          {code.length >= 3 && (
            <><span className="ico_arr">&gt;</span><Link href={`/Product/Category/Display/${code.slice(0, 3)}`}>국내도서</Link></>
          )}
          {code.length >= 6 && parentName && (
            <><span className="ico_arr">&gt;</span><Link href={`/Product/Category/Display/${code.slice(0, 6)}`}>{parentName}</Link></>
          )}
          <span className="ico_arr">&gt;</span>
          <span style={{ color: '#333' }}>{category?.name_ko}</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', gap: 30, paddingTop: 10 }}>
        {/* Sidebar */}
        <div style={{ width: 180, flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#333', paddingBottom: 10, borderBottom: '2px solid #333', marginBottom: 10 }}>
            {sidebarTitle}
          </h2>
          <ul style={{ listStyle: 'none' }}>
            {sidebarCategories.map(cat => (
              <li key={cat.code} style={{ borderBottom: '1px solid #ebebeb' }}>
                <Link
                  href={`/Product/Category/Display/${cat.code}`}
                  style={{
                    display: 'block', padding: '9px 0', fontSize: 13,
                    color: cat.code === code ? '#0080ff' : '#333',
                    fontWeight: cat.code === code ? 700 : 400,
                    textDecoration: 'none',
                  }}
                >
                  {cat.name_ko}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1 }}>
          {/* Category Title */}
          <div style={{ marginBottom: 15, paddingBottom: 10, borderBottom: '2px solid #333' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333' }}>{category?.name_ko}</h2>
          </div>

          {/* Toolbar */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 0', borderBottom: '1px solid #ebebeb', marginBottom: 15,
          }}>
            <span style={{ fontSize: 12, color: '#999' }}>
              총 <strong style={{ color: '#0080ff' }}>{products.total.toLocaleString()}</strong>개
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <select className="yesSelNor" value={sort} onChange={(e) => updateQuery({ sort: e.target.value, page: '1' })}>
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <select className="yesSelNor" value={size} onChange={(e) => updateQuery({ size: e.target.value, page: '1' })}>
                {PAGE_SIZES.map(s => (
                  <option key={s} value={s}>{s}개씩</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 2 }}>
                <button
                  onClick={() => updateQuery({ view: 'thumb' })}
                  style={{
                    width: 28, height: 28, border: '1px solid #d8d8d8', fontSize: 14,
                    background: view !== 'list' ? '#333' : '#fff', color: view !== 'list' ? '#fff' : '#333',
                    cursor: 'pointer',
                  }}
                >▦</button>
                <button
                  onClick={() => updateQuery({ view: 'list' })}
                  style={{
                    width: 28, height: 28, border: '1px solid #d8d8d8', fontSize: 14,
                    background: view === 'list' ? '#333' : '#fff', color: view === 'list' ? '#fff' : '#333',
                    cursor: 'pointer',
                  }}
                >☰</button>
              </div>
            </div>
          </div>

          {/* Products */}
          {view === 'list' ? (
            <ul className="sGLi tp_book tp_list" style={{ listStyle: 'none' }}>
              {products.items.map(product => (
                <ProductCard key={product.id} product={product} listView />
              ))}
            </ul>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {products.items.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {products.items.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: '#999', fontSize: 13 }}>
              해당 카테고리에 상품이 없습니다.
            </div>
          )}

          <Pagination
            page={page}
            pages={products.pages}
            baseUrl={`/Product/Category/Display/${code}?sort=${sort}&size=${size}&view=${view}`}
          />
        </div>
      </div>
    </>
  );
}
