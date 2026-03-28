#!/bin/bash
# YES24 Clone - Smoke Test Suite
set -e

BASE="http://localhost"
PASS=0
FAIL=0

check() {
  local desc="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  ✓ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $desc"
    FAIL=$((FAIL + 1))
  fi
}

echo "=========================================="
echo "YES24 Clone - Smoke Tests"
echo "=========================================="

echo ""
echo "[Infrastructure]"
check "Backend health" curl -sf "$BASE/healthz"
check "Backend ready" curl -sf "$BASE/readyz"
check "Robots.txt" curl -sf "$BASE/robots.txt"

echo ""
echo "[Pages render]"
check "Home page" bash -c "curl -sf '$BASE/main/default.aspx' | grep -q 'YES'"
check "Category page" bash -c "curl -sf '$BASE/Product/Category/Display/001' | grep -q '국내도서'"
check "Product detail" bash -c "curl -sf '$BASE/Product/Goods/100000001' | grep -qi 'yes24\|장바구니'"
check "Search page" bash -c "curl -sf '$BASE/Product/Search?query=%EC%86%8C%EC%84%A4' | grep -q '검색'"
check "Bestseller page" bash -c "curl -sf '$BASE/Product/Category/BestSeller' | grep -q '베스트'"
check "Login page" bash -c "curl -sf '$BASE/Templates/FTLogin' | grep -q '로그인'"
check "Cart page" bash -c "curl -sf '$BASE/Cart/Cart' | grep -q '카트'"

echo ""
echo "[API endpoints]"
check "Categories API" bash -c "curl -sf '$BASE/api/v1/categories' | grep -q 'code'"
check "Products API" bash -c "curl -sf '$BASE/api/v1/products/100000001' | grep -q 'title'"
check "Bestseller API" bash -c "curl -sf '$BASE/api/v1/products/bestseller' | grep -q 'items'"
check "New arrivals API" bash -c "curl -sf '$BASE/api/v1/products/new' | grep -q 'goods_no'"
check "Search API" bash -c "curl -sf '$BASE/api/v1/search?query=%EC%97%90%EC%84%B8%EC%9D%B4' | grep -q 'total'"
check "Autocomplete API" bash -c "curl -sf '$BASE/api/v1/search/autocomplete?q=%EC%86%8C' | grep -q '\['"
check "Banners API" bash -c "curl -sf '$BASE/api/v1/banners' | grep -q 'slot'"
check "Events API" bash -c "curl -sf '$BASE/api/v1/events' | grep -q 'event_no'"

echo ""
echo "[Image CDN]"
check "Cover image" curl -sf "$BASE/image/100000001.jpg" -o /dev/null

echo ""
echo "[Dynamic features]"
# Pagination: page 1 and page 2 return different products
P1=$(curl -sf "$BASE/api/v1/categories/001001/products?page=1&size=5" | python3 -c "import sys,json;print(json.load(sys.stdin)['items'][0]['goods_no'])" 2>/dev/null || echo "")
P2=$(curl -sf "$BASE/api/v1/categories/001001/products?page=2&size=5" | python3 -c "import sys,json;print(json.load(sys.stdin)['items'][0]['goods_no'])" 2>/dev/null || echo "")
if [ -n "$P1" ] && [ -n "$P2" ] && [ "$P1" != "$P2" ]; then
  echo "  ✓ Pagination returns different pages"
  PASS=$((PASS + 1))
else
  echo "  ✗ Pagination returns different pages"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "[Security realism]"
check "Admin returns 403" bash -c "curl -s -o /dev/null -w '%{http_code}' '$BASE/admin/' | grep -q '403'"
check "Sitemap.xml" bash -c "curl -sf '$BASE/sitemap.xml' | grep -q 'urlset'"
check "ASP.NET headers" bash -c "curl -sI '$BASE/main/default.aspx' | grep -qi 'ASP.NET\|X-Powered-By'"

echo ""
echo "=========================================="
echo "Results: $PASS passed, $FAIL failed"
echo "=========================================="

exit $FAIL
