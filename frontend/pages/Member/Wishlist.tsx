import { useState } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Product } from '@/lib/types';
import ProductCard from '@/components/common/ProductCard';
import { getImageUrl } from '@/lib/constants';
import MypageLayout from '@/components/layout/MypageLayout';

interface WishItem {
  id: number;
  product_id: number;
  product?: Product;
}

interface Props {
  wishlist: WishItem[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const cookie = ctx.req.headers.cookie || '';

  try {
    const data = await apiFetch<{ items: WishItem[] } | WishItem[]>('/wishlist', {
      isServer: true,
      headers: { cookie },
    });
    const wishlist = Array.isArray(data) ? data : (data as any).items || [];
    return { props: { wishlist } };
  } catch {
    return { redirect: { destination: '/Templates/FTLogin', permanent: false } };
  }
};

export default function WishlistPage({ wishlist }: Props) {
  const router = useRouter();
  const { refreshCartCount } = useAuth();
  const [sortOrder, setSortOrder] = useState<'added' | 'latest'>('added');

  const sortedWishlist = [...wishlist].sort((a, b) => {
    if (sortOrder === 'latest') return b.id - a.id;
    return a.id - b.id;
  });

  const handleAddToCart = async (productId: number) => {
    try {
      await apiFetch('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      alert('카트에 담았습니다.');
      refreshCartCount();
    } catch {
      alert('카트 담기에 실패했습니다.');
    }
  };

  const handleRemove = async (wishId: number) => {
    if (!confirm('위시리스트에서 삭제하시겠습니까?')) return;
    try {
      await apiFetch(`/wishlist/${wishId}`, { method: 'DELETE' });
      router.replace(router.asPath);
    } catch {
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <MypageLayout title="위시리스트">
      <Head><title>위시리스트 - YES24</title></Head>

        {/* Sort Options */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, padding: '10px 0', marginBottom: 12 }}>
          <button
            onClick={() => setSortOrder('added')}
            style={{
              padding: '4px 12px', fontSize: 12, border: '1px solid #ccc', borderRadius: 2,
              cursor: 'pointer',
              background: sortOrder === 'added' ? '#0080ff' : '#fff',
              color: sortOrder === 'added' ? '#fff' : '#333',
            }}
          >
            담은순
          </button>
          <button
            onClick={() => setSortOrder('latest')}
            style={{
              padding: '4px 12px', fontSize: 12, border: '1px solid #ccc', borderRadius: 2,
              cursor: 'pointer',
              background: sortOrder === 'latest' ? '#0080ff' : '#fff',
              color: sortOrder === 'latest' ? '#fff' : '#333',
            }}
          >
            최신순
          </button>
        </div>

        {wishlist.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>
            <svg width="48" height="48" fill="none" stroke="#ccc" strokeWidth="1.5" viewBox="0 0 24 24" style={{ marginBottom: 16 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p style={{ fontSize: 14, marginBottom: 20 }}>위시리스트가 비어있습니다.</p>
            <Link href="/" className="btnC btn_blue" style={{
              display: 'inline-block', padding: '10px 24px', fontSize: 13,
              color: '#fff', background: '#0080ff', borderRadius: 2, textDecoration: 'none',
            }}>
              쇼핑 계속하기
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 20,
            marginBottom: 40,
          }}>
            {sortedWishlist.map(item => (
              <div key={item.id} style={{ position: 'relative' }}>
                {item.product ? (
                  <ProductCard product={item.product} />
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '100%', paddingTop: '140%', background: '#f8f8f8',
                      border: '1px solid #ebebeb', marginBottom: 8,
                    }} />
                    <span style={{ fontSize: 11, color: '#999' }}>상품 ID: {item.product_id}</span>
                  </div>
                )}
                {/* Cart button */}
                <button
                  onClick={() => handleAddToCart(item.product_id)}
                  style={{
                    width: '100%', marginTop: 6, padding: '7px 0',
                    fontSize: 12, fontWeight: 600, color: '#0080ff',
                    background: '#fff', border: '1px solid #0080ff',
                    borderRadius: 2, cursor: 'pointer',
                  }}
                >
                  카트에 담기
                </button>
                {/* Remove button */}
                <button
                  onClick={() => handleRemove(item.id)}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 24, height: 24,
                    background: 'rgba(255,255,255,0.9)', border: '1px solid #ddd',
                    borderRadius: '50%', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 0, fontSize: 0,
                  }}
                  title="삭제"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#999" strokeWidth="1.5">
                    <path d="M2 2l8 8M10 2l-8 8" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
    </MypageLayout>
  );
}
