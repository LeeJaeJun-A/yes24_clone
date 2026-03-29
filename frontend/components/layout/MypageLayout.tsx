import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from './Layout';

const NAV_ITEMS = [
  { label: '마이페이지', href: '/Member/FTMypageMain', isHeader: true },
  { label: '주문내역', href: '/Member/OrderList' },
  { label: '취소/반품/교환', href: '/Member/CancelList' },
  { label: '위시리스트', href: '/Member/Wishlist' },
  { label: '최근 본 상품', href: '/Member/RecentlyViewed' },
  { label: '내 리뷰', href: '/Member/MyReviews' },
  { label: '쿠폰함', href: '/Member/Coupons' },
  { label: 'YES포인트', href: '/Member/Points' },
  { label: '배송지관리', href: '/Member/Addresses' },
  { label: '내 정보 수정', href: '/Member/EditInfo' },
  { label: '1:1 문의', href: '/Member/Inquiry' },
];

interface Props {
  children: React.ReactNode;
  title?: string;
}

export default function MypageLayout({ children, title }: Props) {
  const router = useRouter();
  const currentPath = router.pathname;

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 0 60px', display: 'flex', gap: 30, alignItems: 'flex-start' }}>
        {/* Left Sidebar */}
        <div style={{ width: 160, flexShrink: 0 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/');
            if (item.isHeader) {
              return (
                <div key={item.href}>
                  <Link href={item.href} style={{
                    display: 'block', fontSize: 16, fontWeight: 700, color: '#333',
                    textDecoration: 'none', paddingBottom: 10, marginBottom: 8,
                    borderBottom: '2px solid #333',
                  }}>
                    {item.label}
                  </Link>
                </div>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'block', fontSize: 13, padding: '9px 0',
                  color: isActive ? '#0080ff' : '#555',
                  fontWeight: isActive ? 700 : 400,
                  textDecoration: 'none',
                  borderBottom: '1px solid #f0f0f0',
                  borderLeft: isActive ? '3px solid #0080ff' : '3px solid transparent',
                  paddingLeft: isActive ? 8 : 0,
                  transition: 'all 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = '#0080ff';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.color = '#555';
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <div style={{ paddingBottom: 14, marginBottom: 20, borderBottom: '2px solid #333' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#333', margin: 0 }}>{title}</h2>
            </div>
          )}
          {children}
        </div>
      </div>
    </Layout>
  );
}
