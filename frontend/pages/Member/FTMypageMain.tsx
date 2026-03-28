import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { User, Product } from '@/lib/types';
import { getImageUrl, formatPrice } from '@/lib/constants';

interface Order {
  id: number;
  order_no: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface WishItem {
  id: number;
  product_id: number;
  product?: Product;
}

interface Props {
  user: User | null;
  orders: Order[];
  wishlist: WishItem[];
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const cookie = ctx.req.headers.cookie || '';

  try {
    const [user, ordersData, wishlistData] = await Promise.all([
      apiFetch<User>('/auth/me', { isServer: true, headers: { cookie } }).catch(() => null),
      apiFetch<{ items: Order[] } | Order[]>('/orders', { isServer: true, headers: { cookie } }).catch(() => []),
      apiFetch<{ items: WishItem[] } | WishItem[]>('/wishlist', { isServer: true, headers: { cookie } }).catch(() => []),
    ]);

    if (!user) {
      return { redirect: { destination: '/Templates/FTLogin', permanent: false } };
    }

    const orders = Array.isArray(ordersData) ? ordersData : (ordersData as any).items || [];
    const wishlist = Array.isArray(wishlistData) ? wishlistData : (wishlistData as any).items || [];

    return { props: { user, orders: orders.slice(0, 5), wishlist: wishlist.slice(0, 4) } };
  } catch {
    return { redirect: { destination: '/Templates/FTLogin', permanent: false } };
  }
};

const QUICK_LINKS = [
  { href: '/Member/OrderList', label: '주문목록', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { href: '/Member/Wishlist', label: '위시리스트', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  { href: '#', label: '배송지관리', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
  { href: '#', label: '포인트', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '#', label: '쿠폰', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
  { href: '/Service/Help', label: '1:1문의', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { href: '#', label: '비밀번호변경', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
];

const STATUS_MAP: Record<string, string> = {
  pending: '주문확인중',
  confirmed: '주문확인',
  shipping: '배송중',
  delivered: '배송완료',
  cancelled: '주문취소',
};

export default function FTMypageMain({ user, orders, wishlist }: Props) {
  if (!user) return null;

  return (
    <>
      <Head><title>마이페이지 - YES24</title></Head>

      <div className="yLocation">
        <div className="yLocationCont">
          <Link href="/">웰컴</Link>
          <span className="ico_arr">&gt;</span>
          <span>마이페이지</span>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', paddingTop: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', paddingBottom: 12, borderBottom: '2px solid #333', marginBottom: 24 }}>
          마이페이지
        </h2>

        {/* User Info Card */}
        <div style={{
          background: '#f8f8f8', border: '1px solid #ebebeb', borderRadius: 4,
          padding: '24px 30px', marginBottom: 30, display: 'flex', alignItems: 'center', gap: 30,
        }}>
          {/* Avatar placeholder */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#0080ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 24, fontWeight: 700, flexShrink: 0,
          }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#333', marginBottom: 6 }}>
              {user.username} <span style={{ fontSize: 12, color: '#0080ff', fontWeight: 400 }}>({user.grade})</span>
            </div>
            <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>{user.email}</div>
            <div style={{ fontSize: 13, color: '#333' }}>
              포인트: <strong style={{ color: '#0080ff' }}>{user.point_balance.toLocaleString()}</strong>원
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10,
          marginBottom: 30,
        }}>
          {QUICK_LINKS.map(link => (
            <Link
              key={link.label}
              href={link.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                padding: '16px 8px', border: '1px solid #ebebeb', borderRadius: 4,
                textDecoration: 'none', color: '#333', fontSize: 12, textAlign: 'center',
                transition: 'border-color 0.2s',
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#0080ff'; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#ebebeb'; }}
            >
              <svg width="24" height="24" fill="none" stroke="#0080ff" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={link.icon} />
              </svg>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        <div style={{ marginBottom: 30 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #333', paddingBottom: 8, marginBottom: 12,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>최근 주문</h3>
            <Link href="/Member/OrderList" style={{ fontSize: 12, color: '#0080ff', textDecoration: 'none' }}>전체보기 &gt;</Link>
          </div>

          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>
              최근 주문 내역이 없습니다.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'left', fontWeight: 600 }}>주문번호</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'left', fontWeight: 600 }}>주문일</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600 }}>금액</th>
                  <th style={{ padding: '8px 10px', borderBottom: '1px solid #ebebeb', textAlign: 'center', fontWeight: 600 }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ebebeb' }}>
                      <Link href={`/Member/OrderDetail/${order.order_no}`} style={{ color: '#0080ff', textDecoration: 'none' }}>
                        {order.order_no}
                      </Link>
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ebebeb', color: '#999' }}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ebebeb', textAlign: 'right', fontWeight: 600 }}>
                      {order.total_amount.toLocaleString()}원
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ebebeb', textAlign: 'center' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 2, fontSize: 11,
                        background: order.status === 'delivered' ? '#e8f4ff' : order.status === 'cancelled' ? '#fff0f0' : '#f8f8f8',
                        color: order.status === 'delivered' ? '#0080ff' : order.status === 'cancelled' ? '#ff6666' : '#666',
                      }}>
                        {STATUS_MAP[order.status] || order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Wishlist */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '2px solid #333', paddingBottom: 8, marginBottom: 12,
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>위시리스트</h3>
            <Link href="/Member/Wishlist" style={{ fontSize: 12, color: '#0080ff', textDecoration: 'none' }}>전체보기 &gt;</Link>
          </div>

          {wishlist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>
              위시리스트가 비어있습니다.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
              {wishlist.map(item => {
                if (item.product) {
                  return <ProductCardMini key={item.id} product={item.product} />;
                }
                return (
                  <div key={item.id} style={{ border: '1px solid #ebebeb', borderRadius: 4, padding: 16, textAlign: 'center' }}>
                    <div style={{ width: '100%', paddingTop: '140%', background: '#f8f8f8', marginBottom: 8 }} />
                    <span style={{ fontSize: 11, color: '#999' }}>상품 ID: {item.product_id}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProductCardMini({ product }: { product: Product }) {
  return (
    <Link href={`/Product/Goods/${product.goods_no}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ border: '1px solid #ebebeb', borderRadius: 4, overflow: 'hidden' }}>
        <img src={getImageUrl(product.cover_image)} alt={product.title} style={{ width: '100%', display: 'block' }} loading="lazy" />
        <div style={{ padding: '10px 12px' }}>
          <div style={{
            fontSize: 12, color: '#333', fontWeight: 500, marginBottom: 4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {product.title}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>
            {product.sale_price.toLocaleString()}원
          </div>
        </div>
      </div>
    </Link>
  );
}
