import { ReactNode, useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import { Category } from '@/lib/types';

interface LayoutProps {
  children: ReactNode;
  categories?: Category[];
}

export default function Layout({ children, categories }: LayoutProps) {
  const [cats, setCats] = useState<Category[]>(categories || []);
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    if (!categories || categories.length === 0) {
      fetch('/api/v1/categories')
        .then(r => r.json())
        .then(data => {
          // Flatten tree
          const flat: Category[] = [];
          const flatten = (items: Category[]) => {
            for (const item of items) {
              flat.push(item);
              if (item.children) flatten(item.children);
            }
          };
          flatten(data);
          setCats(flat);
        })
        .catch(() => {});
    }

    // Show cookie banner if not dismissed
    if (!document.cookie.includes('cookie_consent=1')) {
      setShowCookieBanner(true);
    }
  }, [categories]);

  const dismissCookieBanner = () => {
    document.cookie = 'cookie_consent=1; path=/; max-age=31536000';
    setShowCookieBanner(false);
  };

  return (
    <>
      {/* ASP.NET ViewState hidden fields for realism */}
      <form method="post" action="" id="aspnetForm" style={{ display: 'none' }}>
        <input type="hidden" name="__VIEWSTATE" value="/wEPDwULLTE2MTY2ODcyMjkPFgIeE1ZhbGlkYXRlUmVxdWVzdE1vZGUCARYCZg9kFgJmD2QWAgIDD2QWAmYPZBYC" />
        <input type="hidden" name="__VIEWSTATEGENERATOR" value="CA0B0334" />
        <input type="hidden" name="__EVENTVALIDATION" value="/wEdAAQAAADzOwqWkVpMEB0sPbSSz/MGAAAAAA==" />
      </form>

      <Header categories={cats} />
      <main style={{ minHeight: '60vh' }}>{children}</main>
      <Footer />

      {showCookieBanner && (
        <div className="cookie-banner">
          <span>
            이 웹사이트는 사용자 경험 향상을 위해 쿠키를 사용합니다.
            사이트를 계속 이용하시면 쿠키 사용에 동의하는 것으로 간주됩니다.
          </span>
          <button onClick={dismissCookieBanner}>동의합니다</button>
        </div>
      )}

      {/* GTM stub for realism */}
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}
