import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '@/styles/header.module.css';
import { Category, Product } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import { getImageUrl } from '@/lib/constants';
import { getCoverUrl } from '@/lib/api';

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
  const { user, cartCount, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCatTab, setActiveCatTab] = useState('001');
  const [bestsellerCache, setBestsellerCache] = useState<Record<string, Product[]>>({});
  const searchRef = useRef<HTMLDivElement>(null);
  const megaMenuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('yes24_recent_searches');
      if (saved) setRecentSearches(JSON.parse(saved));
    } catch {}
  }, []);

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    try { localStorage.setItem('yes24_recent_searches', JSON.stringify(updated)); } catch {}
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try { localStorage.removeItem('yes24_recent_searches'); } catch {}
    setShowAutocomplete(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      saveRecentSearch(q);
      router.push(`/Product/Search?domain=ALL&query=${encodeURIComponent(q)}`);
      setShowAutocomplete(false);
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    setSelectedIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length >= 1) {
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch(`/api/v1/search/autocomplete?q=${encodeURIComponent(value)}`);
          const data = await res.json();
          setAutocomplete(Array.isArray(data) ? data : []);
          setShowAutocomplete(true);
        } catch { setAutocomplete([]); }
      }, 300);
    } else {
      setAutocomplete([]);
      // Show recent searches when input is empty and focused
      setShowAutocomplete(recentSearches.length > 0);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    const items = searchQuery.length >= 1 ? autocomplete : recentSearches;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIdx >= 0 && items[selectedIdx]) {
      e.preventDefault();
      const q = items[selectedIdx];
      setSearchQuery(q);
      saveRecentSearch(q);
      router.push(`/Product/Search?domain=ALL&query=${encodeURIComponent(q)}`);
      setShowAutocomplete(false);
    } else if (e.key === 'Escape') {
      setShowAutocomplete(false);
      setSelectedIdx(-1);
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong style={{ color: '#0080ff' }}>{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const getSubcategories = (parentCode: string) => {
    return categories.filter(c => c.parent_code === parentCode);
  };

  const fetchBestsellers = useCallback(async (catCode: string) => {
    if (bestsellerCache[catCode]) return;
    try {
      const res = await fetch(`/api/v1/products/bestseller?category_code=${catCode}&size=4`);
      const data = await res.json();
      setBestsellerCache(prev => ({ ...prev, [catCode]: data.items || [] }));
    } catch {}
  }, [bestsellerCache]);

  const handleMegaMenuEnter = () => {
    if (megaMenuTimer.current) {
      clearTimeout(megaMenuTimer.current);
      megaMenuTimer.current = null;
    }
    setShowMegaMenu(true);
  };

  const handleMegaMenuLeave = () => {
    megaMenuTimer.current = setTimeout(() => {
      setShowMegaMenu(false);
      setActiveCategory(null);
    }, 200);
  };

  const handleCategoryHover = (code: string) => {
    setActiveCategory(code);
    fetchBestsellers(code);
  };

  // Recently viewed state
  const [showRecentlyViewed, setShowRecentlyViewed] = useState(false);
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const recentViewedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (recentViewedRef.current && !recentViewedRef.current.contains(e.target as Node)) {
        setShowRecentlyViewed(false);
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const loadRecentlyViewed = async () => {
    if (showRecentlyViewed) { setShowRecentlyViewed(false); return; }
    try {
      const key = 'yes24_recently_viewed';
      const ids: number[] = JSON.parse(localStorage.getItem(key) || '[]');
      if (ids.length === 0) { setRecentProducts([]); setShowRecentlyViewed(true); return; }
      const products: Product[] = [];
      for (const gno of ids.slice(0, 6)) {
        try {
          const res = await fetch(`/api/v1/products/${gno}`);
          if (res.ok) products.push(await res.json());
        } catch {}
      }
      setRecentProducts(products);
    } catch { setRecentProducts([]); }
    setShowRecentlyViewed(true);
  };

  const activeBestsellers = activeCategory ? (bestsellerCache[activeCategory] || []) : [];

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
            {user ? (
              <>
                <span className={styles.utilLink}>
                  {user.username}님
                  <span style={{ marginLeft: 4, fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 700, background: user.grade === '로열' ? '#FFD700' : user.grade === '프리미엄' ? '#9c27b0' : user.grade === '우수' ? '#0080ff' : '#999', color: '#fff' }}>{user.grade}</span>
                </span>
                <span className={styles.utilDivider} />
                <button
                  className={styles.utilLink}
                  onClick={async () => { await logout(); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
                >
                  로그아웃
                </button>
                <span className={styles.utilDivider} />
              </>
            ) : (
              <>
                <Link href="/Templates/FTLogin" className={styles.utilLink}>로그인</Link>
                <span className={styles.utilDivider} />
                <Link href="/Member/Join/Accept" className={styles.utilLink}>회원가입</Link>
                <span className={styles.utilDivider} />
              </>
            )}
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
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchQuery.length >= 1 && autocomplete.length > 0) {
                  setShowAutocomplete(true);
                } else if (!searchQuery && recentSearches.length > 0) {
                  setShowAutocomplete(true);
                }
              }}
              maxLength={80}
              autoComplete="off"
            />
            <button type="submit" className={styles.searchBtn}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </button>
          </form>
          {showAutocomplete && (
            <div className={styles.autocompleteDropdown}>
              {searchQuery.length >= 1 && autocomplete.length > 0 ? (
                <>
                  <div className={styles.autocompleteTitle}>추천 검색어</div>
                  {autocomplete.map((item, i) => (
                    <div
                      key={i}
                      className={styles.autocompleteItem}
                      style={{
                        background: selectedIdx === i ? '#f0f7ff' : 'transparent',
                      }}
                      onMouseEnter={() => setSelectedIdx(i)}
                      onClick={() => {
                        setSearchQuery(item);
                        saveRecentSearch(item);
                        setShowAutocomplete(false);
                        router.push(`/Product/Search?domain=ALL&query=${encodeURIComponent(item)}`);
                      }}
                    >
                      <span style={{ marginRight: 8, color: '#ccc', fontSize: 11 }}>🔍</span>
                      {highlightMatch(item, searchQuery)}
                    </div>
                  ))}
                </>
              ) : !searchQuery && recentSearches.length > 0 ? (
                <>
                  <div className={styles.autocompleteTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>최근 검색어</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); clearRecentSearches(); }}
                      style={{ background: 'none', border: 'none', color: '#999', fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      전체 삭제
                    </button>
                  </div>
                  {recentSearches.map((item, i) => (
                    <div
                      key={i}
                      className={styles.autocompleteItem}
                      style={{
                        background: selectedIdx === i ? '#f0f7ff' : 'transparent',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                      onMouseEnter={() => setSelectedIdx(i)}
                      onClick={() => {
                        setSearchQuery(item);
                        saveRecentSearch(item);
                        setShowAutocomplete(false);
                        router.push(`/Product/Search?domain=ALL&query=${encodeURIComponent(item)}`);
                      }}
                    >
                      <span>
                        <span style={{ marginRight: 8, color: '#ccc', fontSize: 11 }}>🕐</span>
                        {item}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const updated = recentSearches.filter((_, j) => j !== i);
                          setRecentSearches(updated);
                          try { localStorage.setItem('yes24_recent_searches', JSON.stringify(updated)); } catch {}
                          if (updated.length === 0) setShowAutocomplete(false);
                        }}
                        style={{ background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </>
              ) : null}
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
            <span className={styles.cartBadge}>{cartCount}</span>
          </Link>
          <Link href="/Member/OrderList" className={styles.headerUtil}>
            <span className={styles.utilIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </span>
            <span className={styles.utilLabel}>주문</span>
          </Link>
          <div ref={recentViewedRef} style={{ position: 'relative' }}>
            <button
              className={styles.headerUtil}
              onClick={loadRecentlyViewed}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit', color: 'inherit' }}
            >
              <span className={styles.utilIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <span className={styles.utilLabel}>최근</span>
            </button>
            {showRecentlyViewed && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 9999,
                background: '#fff', border: '1px solid #d8d8d8', borderRadius: 4,
                width: 280, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                padding: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #ebebeb' }}>
                  최근 본 상품
                </div>
                {recentProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#999', fontSize: 12 }}>
                    최근 본 상품이 없습니다.
                  </div>
                ) : (
                  recentProducts.map(p => (
                    <Link
                      key={p.id}
                      href={`/Product/Goods/${p.goods_no}`}
                      style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f5f5f5', textDecoration: 'none', color: 'inherit' }}
                      onClick={() => setShowRecentlyViewed(false)}
                    >
                      <img
                        src={getCoverUrl(p.cover_image, p.goods_no)}
                        alt={p.title}
                        style={{ width: 40, height: 56, objectFit: 'cover', border: '1px solid #ebebeb', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#ff6666' }}>
                          {p.sale_price.toLocaleString()}원
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom nav with quick category finder */}
      <div className={styles.navBar}>
        <div className={styles.navBarInner} style={{ position: 'relative' }}>
          <button
            className={styles.quickCateBtn}
            onMouseEnter={handleMegaMenuEnter}
            onMouseLeave={handleMegaMenuLeave}
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

          {/* Mega Menu */}
          <div
            className={`${styles.megaMenuWrap} ${showMegaMenu ? styles.megaMenuVisible : ''}`}
            onMouseEnter={handleMegaMenuEnter}
            onMouseLeave={handleMegaMenuLeave}
          >
            <div className={styles.megaLeft}>
              {MAIN_CATS.map(cat => (
                <div
                  key={cat.code}
                  className={`${styles.megaCate} ${activeCategory === cat.code ? styles.megaCateActive : ''}`}
                  onMouseEnter={() => handleCategoryHover(cat.code)}
                >
                  <span>{cat.name}</span>
                  <span style={{ fontSize: 10 }}>&#9654;</span>
                </div>
              ))}
            </div>
            <div className={styles.megaRight}>
              {activeCategory ? (
                <>
                  {/* Left column: subcategory tree */}
                  <div className={styles.megaSubcatColumn}>
                    {getSubcategories(activeCategory).map(sub => (
                      <div key={sub.code} className={styles.megaSubGroup}>
                        <Link href={`/Product/Category/Display/${sub.code}`} className={styles.megaSubTitle}>
                          {sub.name_ko}
                        </Link>
                        <div className={styles.megaSubChildren}>
                          {getSubcategories(sub.code).slice(0, 8).map(child => (
                            <Link key={child.code} href={`/Product/Category/Display/${child.code}`} className={styles.megaSubLink}>
                              {child.name_ko}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Right column: bestsellers */}
                  <div className={styles.megaBestColumn}>
                    <div className={styles.megaBestHeader}>이 카테고리 베스트</div>
                    {activeBestsellers.length > 0 ? (
                      <div className={styles.megaBestGrid}>
                        {activeBestsellers.slice(0, 4).map((book, idx) => (
                          <Link
                            key={book.id}
                            href={`/Product/Goods/${book.goods_no}`}
                            className={styles.megaBestItem}
                          >
                            <div className={styles.megaBestRank}>{idx + 1}</div>
                            <img
                              src={getCoverUrl(book.cover_image, book.goods_no)}
                              alt={book.title}
                              className={styles.megaBestCover}
                              loading="lazy"
                            />
                            <div className={styles.megaBestInfo}>
                              <div className={styles.megaBestTitle}>{book.title}</div>
                              <div className={styles.megaBestPrice}>
                                {book.sale_price.toLocaleString()}원
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#bbb', fontSize: 12, padding: '20px 0' }}>
                        로딩 중...
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ color: '#999', fontSize: 13, padding: 20 }}>
                  카테고리를 선택해 주세요
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
