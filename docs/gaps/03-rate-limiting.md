# 03 — Rate-limiting infrastructure missing

**Severity: High** · PRD §11, §16.4

## Expected
- §16.4: `@upstash/ratelimit` + `@upstash/redis` for auth, OTP, and password-change endpoints.
- §11: rate limiting on login, OTP request, password change; brute-force lockout after 10 failed logins / 15 min.
- §10: OTP rate-limit 3 requests / 10 min per identifier.

## Current state (evidence)
- `@upstash/ratelimit` / `@upstash/redis` **not in `package.json`**.
- `lib/auth/rate-limit.ts` is DB-backed: `LoginAttempt` count over a 15-min window, 10-failure lockout. Functional for login lockout only.
- `lib/auth/otp.ts` enforces OTP rate (3 / 10 min) via a DB `count` on `OtpRequest`.

## Gap / risk
- No distributed/edge rate limiter; all limiting is per-row DB counting — unbounded write amplification under attack, and no per-IP throttling on `change-password`, `forgot-password`, `reset-password`, `otp/request` beyond identifier counting.
- DB-only approach does not satisfy the explicitly locked `@upstash` requirement and won't hold across horizontally scaled instances without contention.

## Recommendation
1. Install `@upstash/ratelimit` + `@upstash/redis`; add env config.
2. Apply IP + identifier sliding-window limits to all auth endpoints (`login`, `otp/request`, `otp/verify`, `change-password`, `forgot-password`, `reset-password`, `register/*`).
3. Keep the DB `LoginAttempt`/lockout as the durable account-lockout record; use Redis for fast pre-checks.
