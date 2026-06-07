# Product Requirements Document: Multi-Tenant SaaS Platform

## 1. Project Overview

A multi-tenant SaaS platform with three distinct user contexts: **Platform** (super-admin), **Organisation/Tenant** (org admin & staff), and **Client** (end-customer of the tenant). The system provides tenant isolation via subdomain routing, role-based permissions per module, and full system-wide auditability.

**Routing model:**

| Context | URL Pattern | Description |
|---|---|---|
| Platform | `domain.com`, `domain.com/auth/login` | Super-admin operations across all tenants |
| Tenant Admin | `slug.domain.com/admin`, `slug.domain.com/admin/auth/login` | Tenant owners/staff |
| Tenant Client | `slug.domain.com`, `slug.domain.com/auth/login` | End-users of the tenant |

Subdomain (`orgslug`) is resolved by middleware to determine tenancy and routing context. Authenticated users always land on the dashboard for their context; unauthenticated users are redirected to the matching auth screen.

**App structure (Next.js-style route groups, but framework-agnostic):**

```
app/
  (platform)/
    (dashboard)/ ...modules
    auth/login
  (tenant)/
    (admin)/
      (dashboard)/ ...modules
      auth/login
    (client)/
      (dashboard)/ ...modules
      auth/login
```

---

## 2. Core Objectives

- Provide a secure, isolated multi-tenant environment where each organisation operates independently.
- Allow the platform operator to seed, invite, and govern tenants and their data.
- Allow tenant owners to manage their internal users, clients, roles, and templates.
- Allow clients to self-onboard via OTP and access tenant-provided services.
- Capture full audit logs system-wide for compliance and traceability.
- Enforce strict, module-level role-based permissions configurable per tenant via templates.

---

## 3. User Roles

| Role | Scope | Description |
|---|---|---|
| Platform Super Admin | Platform | Full control over the platform — manages all tenants, platform users, role templates, and platform-wide settings. |
| Platform User | Platform | Internal staff with permissions assigned via platform role templates. |
| Tenant Owner | One tenant | First user created when a tenant is seeded. Has unrestricted control within the tenant. Cannot be deleted while owner. |
| Tenant Admin / Staff | One tenant | Users invited by the Owner or other privileged users. Permissions defined by tenant-level role templates. |
| Client | One tenant | End-user of a tenant. Self-onboards via OTP. Restricted to the client-facing area only. |

**Ownership rule:** The first user registered for a tenant is automatically marked as Owner.

---

## 4. Core Features

**Platform layer:**
- Tenant lifecycle management (create, suspend, archive, restore).
- Platform user management (invite + seed initial user).
- Role & permission templates (platform-scoped).
- System-wide activity log viewer.
- Platform settings.
- Per-tenant drill-down: tenant users, tenant clients, tenant activity logs, tenant settings.

**Tenant (Admin) layer:**
- Tenant user management (admin-invite only).
- Tenant activity log.
- Client management (admin-created OR self-onboarded via OTP).
- Tenant-level role & permission management.
- Template management (tenant-scoped configurable templates — content TBD per module).
- Tenant settings.

**Tenant (Client) layer:**
- Self-onboarding via OTP (email).
- Client dashboard with tenant-defined modules.

**Cross-cutting:**
- Force-password-change on first login (`mustChangePassword = true`).
- Admin-triggered password reset (sets `mustChangePassword = true`).
- Audit log on every state-changing action.

---

## 5. Functional Requirements

### 5.1 Authentication

- Login flow per context (Platform / Tenant Admin / Tenant Client) at the URLs above.
- Email + password authentication for Platform users and Tenant users.
- OTP-based authentication for Client self-onboarding (email).
- Session-based or token-based auth (JWT recommended; see assumptions).
- Logout invalidates the session.
- **No "forgot password" / self-service password reset for Platform users or Tenant users.** Password reset is admin-triggered only via `mustChangePassword = true`.
- Clients MAY use OTP-based re-authentication in lieu of password reset (inferred default).

### 5.2 User Creation & Password Flow

- When a Platform Super Admin creates a Platform user, the system generates a temporary password, emails it, and sets `mustChangePassword = true`.
- When a Tenant Admin invites a tenant user, the same flow applies — temp password emailed, `mustChangePassword = true`.
- On first login, the user is forced through a "Set new password" screen before reaching the dashboard.
- An admin can trigger password reset for any user under their scope by setting `mustChangePassword = true` and re-issuing a temp password by email.
- Password complexity: minimum 12 characters, must contain upper, lower, digit, symbol (inferred).
- Old password cannot be reused (last 5, inferred).

### 5.3 Tenant Onboarding (Platform → Organisation)

1. Platform Super Admin creates a tenant: name, slug (subdomain), owner email, owner name.
2. System provisions the tenant record, reserves the slug, and creates the Owner user with `mustChangePassword = true`.
3. Owner receives an email with login URL (`slug.domain.com/admin/auth/login`) and temp password.
4. Owner logs in, changes password, and lands on tenant admin dashboard.

### 5.4 Tenant User Invite (Admin → Staff)

1. Tenant Owner/Admin invites a user via email, assigning a role from tenant role templates.
2. System creates the user, sets `mustChangePassword = true`, emails credentials.
3. User logs in via `slug.domain.com/admin/auth/login`, resets password, accesses assigned modules.

### 5.5 Client Self-Onboarding (OTP)

1. Client visits `slug.domain.com/auth/login` (or signup link).
2. Client enters email address.
3. System sends OTP (6-digit, 5-minute expiry) via email.
4. Client enters OTP → account created (or existing account authenticated).
5. Client completes profile fields required by the tenant.
6. Client lands on the client dashboard.

### 5.6 Role & Permission Templates

- Permissions are scoped per module (e.g., `users:read`, `users:write`, `clients:delete`).
- A role template is a named set of permissions.
- Platform has its own role templates; each tenant has its own role templates independent of the platform.
- Templates are reusable: assigning a template to a user copies the permission set; subsequent template changes apply only with explicit propagation (inferred default: changes propagate to all users assigned that template, with audit log entry).
- Built-in templates per tenant: Owner (immutable, all permissions), Admin, Staff, Read-only.

### 5.7 Activity / Audit Log

- Every state-changing action is logged: who, what, when, IP, user-agent, before/after snapshot for updates.
- Logs are immutable (append-only).
- Platform-level view: all logs across all tenants + platform actions.
- Tenant-level view: only logs scoped to that tenant.
- Filterable by user, action type, date range, module.
- Retention: 7 years (inferred default; configurable per tenant).

### 5.8 Tenant Settings

- Tenant name, logo, contact email, branding (primary color), timezone, locale, default currency.
- Module enable/disable flags (which modules clients/staff see).

### 5.9 Platform Settings

- Global feature flags, default tenant settings template, system email templates, OTP provider config.

---

## 6. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Availability | 99.9% uptime target. |
| Performance | p95 API response < 300 ms for read; < 600 ms for write. |
| Scalability | Horizontal scaling for app tier; tenant-aware DB strategy (see §7). |
| Security | TLS everywhere; encryption at rest; HSTS; secure cookies; CSRF protection. |
| Compliance | Full audit trail; data residency configurable per tenant. |
| Localisation | All user-facing text translatable; per-tenant locale. |
| Observability | Structured logs, request tracing, metrics on auth events and audit log writes. |
| Backups | Daily full + hourly incremental; PITR window of 30 days. |
| Browser support | Latest 2 versions of Chrome, Edge, Firefox, Safari. |

---

## 7. Data and Entity Requirements

### 7.1 Core Entities

| Entity | Key Fields | Notes |
|---|---|---|
| Tenant | id, slug (unique), name, status (active/suspended/archived), ownerUserId, settings (JSON), createdAt | Slug is the subdomain. |
| PlatformUser | id, email (unique), passwordHash, mustChangePassword, status, roleTemplateId, createdAt, lastLoginAt | Lives outside tenant scope. |
| TenantUser | id, tenantId, email (unique within tenant), passwordHash, mustChangePassword, status, roleTemplateId, isOwner, createdAt, lastLoginAt | Email uniqueness scoped to tenant. |
| Client | id, tenantId, email, status, profileJson, createdAt, lastLoginAt | OTP-authenticated via email. |
| RoleTemplate | id, scope (platform/tenant), tenantId (nullable), name, permissions (string[]), isSystem (bool), createdAt | `isSystem = true` for built-ins. |
| Permission | key (e.g., `users:read`), module, description | Static registry. |
| ActivityLog | id, tenantId (nullable for platform actions), actorType, actorId, action, targetType, targetId, beforeJson, afterJson, ip, userAgent, createdAt | Append-only. |
| OtpRequest | id, identifier (email), code (hashed), purpose, expiresAt, consumedAt, attempts | Rate-limited. |
| Session | id, userId, userType, issuedAt, expiresAt, revokedAt, deviceFingerprint | |
| Template (tenant-scoped) | id, tenantId, type, name, contentJson, createdAt | Generic placeholder for tenant templates — concrete types TBD per module. |

### 7.2 Tenancy Strategy (inferred)

- Single database, **tenant-discriminated** rows via `tenantId` foreign key on every tenant-scoped table.
- Row-level security or application-layer enforcement on every query (no query may run without a tenant scope when in tenant context).
- Platform context can query across tenants but must log every cross-tenant read.

---

## 8. API and Integration Requirements

### 8.1 API Conventions

- RESTful (or RPC-style) endpoints organised by context: `/api/platform/...`, `/api/tenant/...`, `/api/client/...`.
- All requests authenticated via session cookie or bearer token.
- Tenant context derived from subdomain + verified against the authenticated user.
- Standard response envelope: `{ data, error, meta }`.
- Pagination: cursor-based, default page size 25, max 100.

### 8.2 Key Endpoint Groups

| Group | Examples |
|---|---|
| Platform — Tenants | `POST /api/platform/tenants`, `GET /api/platform/tenants`, `PATCH /api/platform/tenants/:id` |
| Platform — Users | `POST /api/platform/users` (invite), `POST /api/platform/users/:id/reset-password` |
| Platform — Roles | `GET/POST/PATCH /api/platform/role-templates` |
| Platform — Logs | `GET /api/platform/activity-logs` |
| Tenant — Users | `POST /api/tenant/users` (invite), `POST /api/tenant/users/:id/reset-password` |
| Tenant — Clients | `GET /api/tenant/clients`, `POST /api/tenant/clients` |
| Tenant — Roles | `GET/POST/PATCH /api/tenant/role-templates` |
| Tenant — Logs | `GET /api/tenant/activity-logs` |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `POST /api/auth/change-password`, `POST /api/auth/otp/request`, `POST /api/auth/otp/verify` |

### 8.3 External Integrations

- Transactional email provider (for invites, temp passwords, OTP via email).
- Object storage (for tenant logos/assets).

---

## 9. Authentication and Authorization

### 9.1 Authentication

- **Platform users**: email + password at `domain.com/auth/login`.
- **Tenant users**: email + password at `slug.domain.com/admin/auth/login`.
- **Clients**: OTP at `slug.domain.com/auth/login`.
- Sessions are context-bound — a Platform session cannot authenticate against a tenant endpoint and vice versa.
- Cookies are scoped: platform cookies on apex domain, tenant cookies on subdomain.

### 9.2 Authorization

- Middleware resolves subdomain → tenant → context.
- Every protected route checks: (a) session validity, (b) user belongs to the resolved tenant, (c) user's role template includes the required permission key.
- Owner role bypasses permission checks within their tenant.
- Platform Super Admin bypasses permission checks platform-wide.

### 9.3 Middleware Flow

1. Parse host → extract subdomain.
2. If apex domain → platform context.
3. If subdomain matches a tenant slug → tenant context; check path prefix `/admin` → admin sub-context, else client sub-context.
4. If subdomain unknown → 404.
5. Load session; if missing on protected route → redirect to context-appropriate `/auth/login`.

---

## 10. Validation and Error Handling

- All inputs validated at the API boundary against a schema (server-side, mandatory).
- Email format, slug format (`^[a-z0-9][a-z0-9-]{2,30}[a-z0-9]$`).
- Slug uniqueness checked at tenant creation; reserved slugs blocked (e.g., `admin`, `api`, `www`, `app`, `auth`).
- OTP: max 5 attempts per code, 5-minute expiry, rate-limit 3 requests/10 min per identifier.
- Standard error codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate-limited, `500` server error.
- User-facing error messages are sanitised; internal details only in logs.

---

## 11. Security Considerations

- Passwords hashed with Argon2id (or bcrypt cost ≥ 12).
- OTP codes stored hashed; never returned in API responses.
- Per-tenant data isolation enforced at the query layer; integration tests verify cross-tenant reads/writes are impossible.
- CSRF tokens on all state-changing requests for cookie-based sessions.
- Rate limiting on auth endpoints (login, OTP request, password change).
- Brute-force protection: account lockout after 10 failed login attempts within 15 minutes.
- Audit log writes are transactional with the action — either both commit or neither.
- Audit logs are read-only via API; no update or delete endpoints exist.
- Subdomain takeover protection: archived tenant slugs are quarantined for 90 days before re-use.
- All admin-triggered password resets and role changes generate audit entries with actor identity.

---

## 12. System Workflows

### 12.1 Platform Creates Tenant

```
SuperAdmin → POST /api/platform/tenants
  → validate slug, email
  → create Tenant + Owner TenantUser (mustChangePassword=true)
  → send invite email with temp password
  → write ActivityLog (platform-scope)
  → return tenant payload
```

### 12.2 First Login (Force Password Change)

```
User → POST /api/auth/login
  → verify credentials
  → if mustChangePassword=true → return token with restricted scope (change-password only)
  → user navigates to /auth/change-password
  → POST /api/auth/change-password → set new password, mustChangePassword=false
  → issue full session
  → redirect to dashboard
```

### 12.3 Admin-Triggered Password Reset

```
Admin → POST /api/tenant/users/:id/reset-password
  → check permission
  → generate temp password, set mustChangePassword=true
  → revoke active sessions for that user
  → email temp password
  → write ActivityLog
```

### 12.4 Client OTP Onboarding

```
Client → POST /api/auth/otp/request {identifier}
  → rate-limit check
  → generate OTP, hash, store with expiry
  → send via email
Client → POST /api/auth/otp/verify {identifier, code}
  → verify hash + expiry + attempts
  → upsert Client record under tenant
  → issue session
  → if new profile fields required → redirect to profile completion
  → else redirect to dashboard
```

### 12.5 Permission Check on Protected Route

```
Request → middleware
  → resolve tenant from subdomain
  → load session
  → verify session.tenantId == resolvedTenantId (or platform)
  → load role template + permissions
  → check required permission for route
  → 403 if missing
```

---

## 13. Edge Cases

- User tries to access a tenant they don't belong to → 404 (do not leak existence).
- Slug collision at tenant creation → 409 with explicit message.
- Owner deletion attempt → blocked; must transfer ownership first.
- Tenant suspended → all tenant users and clients see a maintenance/blocked screen; platform admins can still operate.
- OTP requested for an identifier that already exists as a different role within the same tenant → reject with generic error.
- User assigned a role template that gets deleted → user falls back to a read-only template until reassigned; audit log entry.
- Subdomain reuse after tenant archive → blocked for 90 days.
- Concurrent password change on the same account → second request invalidated.
- Login attempt while `mustChangePassword=true` → only change-password endpoint accessible.
- Email already exists across multiple tenants → permitted; uniqueness is per tenant for tenant users.
- Platform user with same email as a tenant user → permitted; contexts are isolated.
- Browser cached on old subdomain after tenant rename → middleware returns 404; old slug never resolved.

---

## 14. Acceptance Criteria

- A Platform Super Admin can create a tenant, and the Owner receives a working invite email with a temp password.
- The Owner can log in at `slug.domain.com/admin/auth/login`, is forced through password change, and lands on the admin dashboard.
- Owner can invite a staff user; staff user receives email, completes password change, and accesses only modules their role permits.
- A client can self-onboard at `slug.domain.com/auth/login` using OTP without any pre-provisioning.
- All state-changing actions appear in the appropriate activity log (tenant-scoped or platform-scoped) with actor, timestamp, before/after data.
- An admin can trigger password reset; user is logged out everywhere and forced to set a new password on next login.
- Cross-tenant data access is impossible: a Tenant A user cannot read or modify any Tenant B record under any circumstance (verified by automated tests).
- All routes redirect unauthenticated users to the correct context-specific login page.
- All routes redirect authenticated users to the dashboard when visiting an auth page.
- Reserved slugs (`admin`, `api`, `www`, `app`, `auth`) cannot be used for tenants.
- No "forgot password" link exists anywhere for Platform or Tenant users.
- No placeholder pages, no "TODO" stubs, no mock data in the shipped implementation.

---

## 15. Assumptions and Open Questions

### Confirmed Requirements

- Three contexts: Platform, Tenant Admin, Tenant Client.
- Subdomain-based tenant resolution via middleware.
- First tenant user = Owner.
- `mustChangePassword` flag set on user creation; emails include temp password.
- Admins can re-trigger `mustChangePassword`.
- No self-service password reset for Platform or Tenant users.
- Client self-onboarding via OTP.
- Module-level role-permission templates.
- Full system-wide audit logs.
- Authenticated route always = dashboard; unauthenticated = redirect to auth.
- No placeholders or stubs in implementation.

### Inferred Assumptions

- Tenancy isolation = single DB with `tenantId` discriminator + row-level enforcement.
- OTP: 6 digits, 5-min expiry, hashed at rest, rate-limited.
- Password policy: 12+ chars, complexity rules, last-5 reuse blocked.
- Argon2id for password hashing.
- Audit log retention: 7 years.
- Cursor-based pagination, default 25 / max 100.
- Cookie scoping: apex vs. subdomain.
- Built-in tenant role templates: Owner, Admin, Staff, Read-only.
- Reserved subdomain list includes at least: `admin`, `api`, `www`, `app`, `auth`.
- Role template edits propagate to all assigned users with audit entry.

### Open Questions

- What specific modules exist beyond Users, Clients, Roles, Activity, Templates, Settings?
- What concrete `Template` types exist per tenant (the entity is referenced but its content is unspecified)?
- Is multi-factor authentication required for Platform users? (Recommended: yes, TOTP.)
- Should Clients also support email + password auth as an alternative to OTP, or strictly OTP-only?
- Is there a billing/subscription layer per tenant?
- What is the data residency / regional hosting policy?
- Should there be a tenant-level API key system for programmatic access?
- Notification preferences — in-app, email — per user?
- Localisation: which languages are required at launch?

### Optional Recommendations

- Add MFA (TOTP) for Platform users and Tenant Owners.
- Add a tenant-level "impersonation" mode for Platform Super Admin (audited) to support customers.
- Add webhook outbound events for major tenant lifecycle actions (created, suspended, archived).
- Provide a CLI / admin scripting interface for bulk tenant provisioning.
- Add structured permission discovery endpoint so the front-end can dynamically render permitted nav items.

---

## 16. Libraries To Use

This is the **canonical, locked stack**. Do not substitute, do not add alternatives, do not introduce a second library that overlaps with one already listed. If a need arises that none of these cover, add it here first before installing.

### 16.1 Framework & Runtime

| Concern | Library | Version | Notes |
|---|---|---|---|
| Web framework | `next` | `16.2.6` | App Router only. Read `node_modules/next/dist/docs/` before writing route handlers, middleware, or server actions — this version has breaking changes from older Next.js. |
| UI runtime | `react`, `react-dom` | `19.2.4` | Server Components by default. Mark client components explicitly with `"use client"`. |
| Language | `typescript` | `^5` | `strict: true`. No `any` outside of explicit `unknown` narrowing. |
| Node types | `@types/node` | `^20` | Node 20 LTS target. |

### 16.2 Database & ORM

| Concern | Library | Version | Notes |
|---|---|---|---|
| ORM | `@prisma/client`, `prisma` | `^7.8.0` | Schema lives in `prisma/schema.prisma`. Use `prisma.config.ts` for config. |
| Postgres driver | `pg`, `@types/pg` | `^8.20.0` | Used by the Prisma pg adapter. |
| Prisma driver adapter | `@prisma/adapter-pg` | `^7.8.0` | Required wiring for Prisma 7 + node-postgres. |
| Migrations | `prisma migrate` | bundled | Use `npm run db:migrate` (dev) and `db:migrate:deploy` (prod). |
| Tenancy enforcement | Prisma middleware / extension | bundled | Tenant scoping enforced via a Prisma client extension that injects `tenantId` on every tenant-scoped model. No raw SQL bypass. |

### 16.3 Styling & UI

| Concern | Library | Version | Notes |
|---|---|---|---|
| CSS engine | `tailwindcss`, `@tailwindcss/postcss` | `^4` | Tailwind v4. Config is CSS-first via `app/globals.css` — no `tailwind.config.js`. |
| Component primitives | `radix-ui` | `^1.4.3` | The unified `radix-ui` package, not per-primitive `@radix-ui/*`. |
| Component generator | `shadcn` | `^4.7.0` | Style: `radix-nova`. Base color: `stone`. Components land under `@/components/ui`. Never edit a generated component to fork it — re-generate. |
| Class composition | `clsx`, `tailwind-merge` | `^2.1.1`, `^3.6.0` | Always combined via `cn()` in `@/lib/utils`. Do not use `classnames` or hand-concatenated strings. |
| Variants | `class-variance-authority` | `^0.7.1` | For component variants only. Not a general utility — don't use it for one-off conditional classes. |
| Animations | `tw-animate-css` | `^1.4.0` | Tailwind v4 animation utilities. No `framer-motion` unless added here later. |
| Icons | `@hugeicons/react`, `@hugeicons/core-free-icons` | `^1.1.6`, `^4.1.4` | Hugeicons only. Do not import `lucide-react`, `heroicons`, or any other icon set. |

### 16.4 Authentication, Sessions & Crypto

**All authentication logic is written by hand.** No auth framework, no auth helper library, no "drop-in" identity package. Login, logout, session issuance, session verification, CSRF, OTP issuance/verification, password reset, role/permission checks, and the subdomain-aware middleware (§9.3) are all hand-rolled inside this repo. Only low-level cryptographic primitives below are permitted — and only because writing them from scratch would be unsafe.

| Concern | Library | Version | Notes |
|---|---|---|---|
| Password hashing | `argon2` | latest stable | Argon2id primitive only. Hash/verify wrappers and the password policy live in `@/lib/auth/password.ts`, written by us. Do not use `bcrypt`, `bcryptjs`, or `scrypt`. |
| Session tokens | `node:crypto` (builtin) | builtin | Sessions are opaque random tokens (`randomBytes(32).toString('base64url')`) stored server-side in the `Session` table (§7.1) and referenced by an HttpOnly cookie. **No JWTs.** Do not install `jose` or `jsonwebtoken`. |
| Cookies | Next.js `cookies()` API | bundled | Use the framework primitive directly — read/write/clear by hand. Do not add `cookie`, `cookies-next`, or `iron-session`. |
| CSRF | hand-rolled, double-submit cookie | — | Implemented in `@/lib/auth/csrf.ts` using `node:crypto` `randomBytes` + `timingSafeEqual`. Do not install `@edge-csrf/*`, `csurf`, or any CSRF package. |
| Random / OTP / temp passwords | `node:crypto` | builtin | `randomInt(0, 1_000_000)` for 6-digit OTPs, `randomBytes` for temp passwords and session IDs. No third-party RNG. |
| Constant-time compare | `node:crypto` `timingSafeEqual` | builtin | Required for OTP code comparison, CSRF token comparison, and any other secret comparison. Never use `===` for secrets. |
| Rate limiting | `@upstash/ratelimit` + `@upstash/redis` | latest stable | Infrastructure, not auth logic. For auth, OTP, and password-change endpoints per §11. |

**Hand-rolled auth surface (must exist in this repo, not imported):**

- `@/lib/auth/password.ts` — hash, verify, policy validator, last-5 reuse check.
- `@/lib/auth/session.ts` — `createSession`, `getSession`, `revokeSession`, `revokeAllSessionsForUser`. Backed by the `Session` table.
- `@/lib/auth/otp.ts` — `issueOtp`, `verifyOtp`, attempt + expiry + rate-limit enforcement.
- `@/lib/auth/csrf.ts` — `issueCsrfToken`, `verifyCsrfToken` (double-submit cookie pattern).
- `@/lib/auth/context.ts` — subdomain → tenant → context resolver used by middleware (§9.3).
- `@/lib/auth/permissions.ts` — permission key registry + `hasPermission(user, key)` check, with Owner / Platform Super Admin bypass.
- `@/lib/auth/middleware.ts` — the Next.js middleware that ties all of the above together.

If you find yourself reaching for an "auth helper" library to fill any of the above, stop and write the function instead.

### 16.5 Validation & Forms

| Concern | Library | Version | Notes |
|---|---|---|---|
| Schema validation | `zod` | latest stable v3 | Every API boundary validates with Zod. Infer TS types from schemas — do not duplicate. |
| Form state (client) | `react-hook-form` | latest stable | Pair with `@hookform/resolvers` for Zod. |
| Form resolver | `@hookform/resolvers` | latest stable | Zod resolver only. |

### 16.6 External Services & Integrations

| Concern | Library | Version | Notes |
|---|---|---|---|
| Transactional email | `nodemailer` | latest stable | For invites, temp passwords, email OTP. SMTP transport configured via env. |
| Email templates | `@react-email/components` + `react-email` | latest stable | All emails authored as React components and rendered to HTML before handing to nodemailer. No HTML strings, no Handlebars. |
| Object storage | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | latest stable | For tenant logos/assets. S3-compatible endpoints supported via SDK config. |

### 16.7 Observability

| Concern | Library | Version | Notes |
|---|---|---|---|
| Structured logging | `pino` + `pino-pretty` (dev only) | latest stable | JSON logs in prod. No `winston`, no `console.log` in committed code. |
| Tracing / metrics | `@opentelemetry/api` + `@opentelemetry/sdk-node` | latest stable | OTel for auth events and audit log writes (§6 observability requirement). |
| Error reporting | `@sentry/nextjs` | latest stable | Server + client. |

### 16.8 Date, Time, Locale

| Concern | Library | Version | Notes |
|---|---|---|---|
| Dates | `date-fns` | latest stable v3+ | Tree-shakeable. No `moment`, no `dayjs`. |
| Timezones | `date-fns-tz` | latest stable | Tenant timezone handling per §5.8. |
| i18n | `next-intl` | latest stable | Per-tenant locale per §6. |

### 16.9 Utilities

| Concern | Library | Version | Notes |
|---|---|---|---|
| Env loading (scripts) | `dotenv` | `^17.4.2` | Already present. Only for scripts/seed files — Next.js loads `.env*` itself. |
| TS script runner | `tsx` | `^4.22.0` | Seed scripts, one-off CLI. Do not use `ts-node`. |

### 16.10 Tooling

| Concern | Library | Version | Notes |
|---|---|---|---|
| Linting | `eslint`, `eslint-config-next` | `^9`, `16.2.6` | Use the Next.js flat config. |
| Formatting | `prettier` + `prettier-plugin-tailwindcss` | latest stable | Tailwind class sorting enforced. |
| Unit / integration tests | `vitest` + `@vitest/coverage-v8` | latest stable | No Jest. |
| E2E tests | `playwright` | latest stable | Required for the cross-tenant isolation tests in §14. |
| Test data | `@faker-js/faker` | latest stable | For seeds and tests only — never imported in app code. |

### 16.11 Hard Bans

These overlap with the locked choices above and **must not** be added:

- `bcrypt`, `bcryptjs`, `scrypt` (use `argon2`).
- `jose`, `jsonwebtoken`, `jws`, `jwks-rsa` — no JWTs. Sessions are opaque random tokens stored in the DB (§16.4).
- `next-auth` / `auth.js`, `lucia`, `clerk`, `kinde`, `@workos-inc/*`, `supabase-auth-helpers`, `firebase-auth`, `passport`, `passport-*`, `better-auth`, `oslo` — auth is hand-rolled per §9 and §16.4; no third-party auth layer of any kind.
- `iron-session`, `cookie-session`, `express-session`, `cookies-next`, `cookie` — sessions and cookies are handled directly via Next.js primitives + the `Session` table.
- `@edge-csrf/*`, `csurf`, `csrf` — CSRF is hand-rolled in `@/lib/auth/csrf.ts`.
- `otplib`, `speakeasy`, `notp` — OTPs are generated and verified in-house with `node:crypto`.
- `moment`, `dayjs`, `luxon` (use `date-fns`).
- `axios`, `node-fetch`, `got`, `superagent` — use the platform `fetch`.
- `lodash`, `underscore`, `ramda` — use native JS or write the helper.
- `lucide-react`, `react-icons`, `heroicons`, `@radix-ui/react-icons` (use Hugeicons).
- `framer-motion` (use `tw-animate-css` for now; revisit here before adding).
- `jest`, `mocha`, `chai` (use `vitest`).
- `resend`, `@sendgrid/mail`, `postmark`, `mailgun.js` (use `nodemailer`).
- `twilio`, `@twilio/voice-sdk`, any SMS SDK — SMS is out of scope; OTP is email-only.
- `winston`, `bunyan`, `morgan` (use `pino`).
- Any `@radix-ui/react-*` per-primitive packages (use the unified `radix-ui`).

### 16.12 Rule of Addition

Before installing anything not listed above:

1. Open a PR that **first** edits this section to add the dependency, with a one-line justification and the concern it covers.
2. Confirm no existing entry already covers it.
3. Then install.

No exceptions for "just trying something out" — `package.json` is not a scratchpad.
