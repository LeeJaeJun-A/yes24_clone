import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/header.module.css';
import { Category } from '@/lib/types';

const MAIN_CATS = [
  { code: '001', name: '국내도서' },
  { code: '002', name: '외국도서' },
  { code: '007', name: '중고샵' },
  { code: '005', name: 'eBook' },
  { code: '009', name: '크레마클럽' },
  { code: '003', name: 'CD/LP' },
  { code: '004', name: 'DVD/BD' },
  { code: '006', name: '문구/GIFT' },
  { code: '008', name: '티켓' },
];

interface HeaderProps {
  categories?: Category[];
}

export default function Header({ categories = [] }: HeaderProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCatTab, setActiveCatTab] = useState('001');
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/Product/Search?domain=ALL&query=${encodeURIComponent(searchQuery)}`);
      setShowAutocomplete(false);
    }
  };

  const handleSearchInput = async (value: string) => {
    setSearchQuery(value);
    if (value.length >= 1) {
      try {
        const res = await fetch(`/api/v1/search/autocomplete?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setAutocomplete(Array.isArray(data) ? data : []);
        setShowAutocomplete(true);
      } catch { setAutocomplete([]); }
    } else { setShowAutocomplete(false); }
  };

  const getSubcategories = (parentCode: string) => {
    return categories.filter(c => c.parent_code === parentCode);
  };

  return (
    <header className={styles.header}>
      {/* Top Bar - Dark navy with category tabs */}
      <div className={styles.topBar}>
        <div className={styles.topBarInner}>
          <div className={styles.cateTabs}>
            {MAIN_CATS.map(cat => (
              <Link
                key={cat.code}
                href={`/Product/Category/Display/${cat.code}`}
                className={`${styles.cateTab} ${activeCatTab === cat.code ? styles.cateTabActive : ''}`}
                onMouseEnter={() => setActiveCatTab(cat.code)}
              >
                {cat.name}
              </Link>
            ))}
          </div>
          <div className={styles.utilLinks}>
            <Link href="/Templates/FTLogin" className={styles.utilLink}>로그인</Link>
            <span className={styles.utilDivider} />
            <Link href="/Member/Join/Accept" className={styles.utilLink}>회원가입</Link>
            <span className={styles.utilDivider} />
            <Link href="/Member/FTMypageMain" className={styles.utilLink}>마이페이지</Link>
            <span className={styles.utilDivider} />
            <Link href="/Cart/Cart" className={styles.utilLink}>카트</Link>
            <span className={styles.utilDivider} />
            <Link href="/Member/OrderList" className={styles.utilLink}>주문/배송</Link>
            <span className={styles.utilDivider} />
            <Link href="/Service/Help" className={styles.utilLink}>고객센터</Link>
          </div>
        </div>
      </div>

      {/* Middle - Logo, Search, Utils */}
      <div className={styles.midBar}>
        <Link href="/main/default.aspx" className={styles.logo}>
          <img
            src="https://image.yes24.com/sysimage/renew/gnb/logoN4.svg"
            alt="YES24"
            className={styles.logoImg}
            onError={(e) => {
              (e.target as HTMLImageElement).onerror = null;
              (e.target as HTMLImageElement).src = '';
              (e.target as HTMLImageElement).alt = 'YES24';
              (e.target as HTMLImageElement).style.cssText = 'font-size:28px;font-weight:900;color:#0080ff;line-height:48px;';
            }}
          />
        </Link>

        <div className={styles.searchBox} ref={searchRef}>
          <form className={styles.searchForm} onSubmit={handleSearch} acceptCharset="utf-8">
            <input type="hidden" name="domain" value="ALL" />
            <input
              type="text"
              name="query"
              className={styles.searchInput}
              placeholder="검색어를 입력해 주세요"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => autocomplete.length > 0 && setShowAutocomplete(true)}
              maxLength={80}
              autoComplete="off"
            />
            <button type="submit" className={styles.searchBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </form>
          {showAutocomplete && autocomplete.length > 0 && (
            <div className={styles.autocompleteDropdown}>
              <div className={styles.autocompleteTitle}>추천 검색어</div>
              {autocomplete.map((item, i) => (
                <div
                  key={i}
                  className={styles.autocompleteItem}
                  onClick={() => {
                    setSearchQuery(item);
                    setShowAutocomplete(false);
                    router.push(`/Product/Search?domain=ALL&query=${encodeURIComponent(item)}`);
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.headerUtils}>
          <Link href="/Member/Wishlist" className={styles.headerUtil}>
            <span className={styles.utilIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </span>
            <span className={styles.utilLabel}>위시</span>
          </Link>
          <Link href="/Cart/Cart" className={styles.headerUtil}>
            <span className={styles.utilIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            </span>
            <span className={styles.utilLabel}>카트</span>
            <span className={styles.cartBadge}>0</span>
          </Link>
          <Link href="/Member/OrderList" className={styles.headerUtil}>
            <span className={styles.utilIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </span>
            <span className={styles.utilLabel}>주문</span>
          </Link>
        </div>
      </div>

      {/* Bottom nav with quick category finder */}
      <div className={styles.navBar}>
        <div className={styles.navBarInner} style={{ position: 'relative' }}>
          <button
            className={styles.quickCateBtn}
            onMouseEnter={() => setShowMegaMenu(true)}
            onMouseLeave={() => setShowMegaMenu(false)}
          >
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" style={{ verticalAlign: 'middle' }}>
              <rect y="0" width="16" height="2" rx="1" fill="#fff"/>
              <rect y="6" width="16" height="2" rx="1" fill="#fff"/>
              <rect y="12" width="16" height="2" rx="1" fill="#fff"/>
            </svg>
            <span style={{ verticalAlign: 'middle' }}>빠른분야찾기</span>
          </button>
          <nav className={styles.navLinks}>
            <Link href="/Product/Category/BestSeller" className={styles.navLink}>베스트</Link>
            <Link href="/Product/Category/NewProduct" className={styles.navLink}>신간</Link>
            <Link href="/Product/Category/SteadySeller" className={styles.navLink}>스테디셀러</Link>
            <Link href="/Event/List" className={styles.navLink}>이벤트</Link>
            <Link href="/Product/Category/Recommended" className={styles.navLink}>YES추천</Link>
            <Link href="/Funding/List" className={styles.navLink}>펀딩</Link>
          </nav>

          {showMegaMenu && (
            <div
              className={styles.megaMenuWrap}
              onMouseEnter={() => setShowMegaMenu(true)}
              onMouseLeave={() => setShowMegaMenu(false)}
            >
              <div className={styles.megaLeft}>
                {MAIN_CATS.map(cat => (
                  <div
                    key={cat.code}
                    className={`${styles.megaCate} ${activeCategory === cat.code ? styles.megaCateActive : ''}`}
                    onMouseEnter={() => setActiveCategory(cat.code)}
                  >
                    <span>{cat.name}</span>
                    <span style={{ fontSize: 10 }}>▶</span>
                  </div>
                ))}
              </div>
              <div className={styles.megaRight}>
                {activeCategory && getSubcategories(activeCategory).map(sub => (
                  <div key={sub.code} className={styles.megaSubGroup}>
                    <Link href={`/Product/Category/Display/${sub.code}`} className={styles.megaSubTitle}>
                      {sub.name_ko}
                    </Link>
                    {getSubcategories(sub.code).slice(0, 6).map(child => (
                      <Link key={child.code} href={`/Product/Category/Display/${child.code}`} className={styles.megaSubLink}>
                        {child.name_ko}
                      </Link>
                    ))}
                  </div>
                ))}
                {!activeCategory && (
                  <div style={{ color: '#999', fontSize: 13, padding: 20 }}>
                    카테고리를 선택해 주세요
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
