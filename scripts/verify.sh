#!/bin/bash
# YES24 Clone - Smoke Test Suite
set -e

BASE="${1:-http://localhost}"
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
echo "Target: $BASE"
echo "=========================================="

echo ""
echo "[Infrastructure]"
check "Backend health"  curl -sf "$BASE/healthz"
check "Backend ready"   curl -sf "$BASE/readyz"
check "Robots.txt"      curl -sf "$BASE/robots.txt"

echo ""
echo "[Pages render]"
check "Home page"         bash -c "curl -sf '$BASE/main/default.aspx' | grep -q 'YES'"
check "Category page"     bash -c "curl -sf '$BASE/Product/Category/Display/001' | grep -q 'YES'"
check "Bestseller page"   bash -c "curl -sf '$BASE/Product/Category/BestSeller' | grep -q 'YES'"
check "New arrivals page" bash -c "curl -sf '$BASE/Product/Category/NewProduct' | grep -q 'YES'"
check "Search page"       bash -c "curl -sf '$BASE/Product/Search?query=%EC%86%8C%EC%84%A4' | grep -q 'YES'"
check "Login page"        bash -c "curl -sf '$BASE/Templates/FTLogin' | grep -q 'YES'"
check "Cart page"         bash -c "curl -sf '$BASE/Cart/Cart' | grep -q 'YES'"
check "Event list"        bash -c "curl -sf '$BASE/Event/List' | grep -q 'YES'"
check "404 page"          bash -c "curl -s -o /dev/null -w '%{http_code}' '$BASE/this-page-does-not-exist' | grep -q '404'"

echo ""
echo "[API endpoints]"
check "Categories API"    bash -c "curl -sf '$BASE/api/v1/categories' | grep -q 'code'"
check "Bestseller API"    bash -c "curl -sf '$BASE/api/v1/products/bestseller?size=5' | grep -q 'items'"
check "New arrivals API"  bash -c "curl -sf '$BASE/api/v1/products/new?limit=5' | grep -q 'goods_no'"
check "Recommended API"   bash -c "curl -sf '$BASE/api/v1/products/recommended?limit=5' | grep -q 'goods_no'"
check "Search API"        bash -c "curl -sf '$BASE/api/v1/search?query=%EC%97%90%EC%84%B8%EC%9D%B4' | grep -q 'total'"
check "Autocomplete API"  bash -c "curl -sf '$BASE/api/v1/search/autocomplete?q=%EC%86%8C' | grep -q '\['"
check "Events API"        bash -c "curl -sf '$BASE/api/v1/events' | grep -q 'event_no'"

# Product detail — pick first goods_no from bestseller
GOODS_NO=$(curl -sf "$BASE/api/v1/products/bestseller?size=1" | python3 -c "import sys,json; print(json.load(sys.stdin)['items'][0]['goods_no'])" 2>/dev/null || echo "")
if [ -n "$GOODS_NO" ]; then
  check "Product detail API"  bash -c "curl -sf '$BASE/api/v1/products/$GOODS_NO' | grep -q 'title'"
  check "Product reviews API" bash -c "curl -sf '$BASE/api/v1/products/$GOODS_NO/reviews' | grep -q 'items'"
  check "Product stats API"   bash -c "curl -sf '$BASE/api/v1/products/$GOODS_NO/stats' | grep -q 'gender'"
  check "Product preview API" bash -c "curl -sf '$BASE/api/v1/products/$GOODS_NO/preview' | grep -q 'pages'"
  check "Product detail page" bash -c "curl -sf '$BASE/Product/Goods/$GOODS_NO' | grep -q 'YES'"
else
  echo "  ⚠ Skipping product tests (no goods_no available — is DB seeded?)"
fi

echo ""
echo "[Login flow]"
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@yes24.com","password":"password123"}' 2>/dev/null || echo "")
if echo "$LOGIN" | grep -q "access_token\|session\|user"; then
  echo "  ✓ Login with test account"
  PASS=$((PASS + 1))
else
  echo "  ✗ Login with test account"
  FAIL=$((FAIL + 1))
fi

echo ""
echo "[Security realism]"
check "Admin returns 403"  bash -c "curl -s -o /dev/null -w '%{http_code}' '$BASE/admin/' | grep -q '403'"
check "server_tokens off"  bash -c "curl -sI '$BASE/' | grep -qv 'nginx/'"
check "ASP.NET headers"    bash -c "curl -sI '$BASE/main/default.aspx' | grep -qi 'X-Powered-By'"

echo ""
echo "=========================================="
if [ $FAIL -eq 0 ]; then
  echo "✅ All $PASS tests passed!"
else
  echo "Results: $PASS passed, $FAIL failed"
fi
echo "=========================================="

exit $FAIL
