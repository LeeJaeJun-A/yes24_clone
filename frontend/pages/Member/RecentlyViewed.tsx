import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import MypageLayout from '@/components/layout/MypageLayout';
import { getCoverUrl } from '@/lib/api';

interface Product {
  id: number;
  goods_no: number;
  title: string;
  author: string;
  sale_price: number;
  cover_image: string | null;
  discount_rate: number;
}

export default function RecentlyViewedPage() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const key = 'yes24_recently_viewed';
    const ids: number[] = JSON.parse(localStorage.getItem(key) || '[]');
    if (!ids.length) return;
    // Fetch product info for each id
    Promise.all(
      ids.slice(0, 20).map(id =>
        fetch(`/api/v1/products/${id}`).then(r => r.ok ? r.json() : null).catch(() => null)
      )
    ).then(results => setProducts(results.filter(Boolean)));
  }, []);

  return (
    <MypageLayout title="최근 본 상품">
      <Head><title>최근 본 상품 - YES24</title></Head>
      {products.length === 0 ? (
        <div style={{ background: '#f9f9f9', border: '1px solid #ebebeb', borderRadius: 4, padding: '60px 20px', textAlign: 'center', color: '#999' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👁</div>
          <p style={{ fontSize: 14 }}>최근 본 상품이 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {products.map(p => (
            <Link key={p.goods_no} href={`/Product/Goods/${p.goods_no}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div style={{ border: '1px solid #ebebeb', borderRadius: 4, overflow: 'hidden' }}>
                <img src={getCoverUrl(p.cover_image, p.goods_no)} alt={p.title}
                  style={{ width: '100%', aspectRatio: '5/7', objectFit: 'cover' }} />
                <div style={{ padding: '10px 10px 12px' }}>
                  <p style={{ fontSize: 12, color: '#333', fontWeight: 500, marginBottom: 4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</p>
                  <p style={{ fontSize: 11, color: '#999', marginBottom: 6 }}>{p.author}</p>
                  <p style={{ fontSize: 13, color: '#e51937', fontWeight: 700 }}>
                    {p.sale_price.toLocaleString()}원
                    {p.discount_rate > 0 && <span style={{ fontSize: 11, marginLeft: 4 }}>{p.discount_rate}%</span>}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </MypageLayout>
  );
}
