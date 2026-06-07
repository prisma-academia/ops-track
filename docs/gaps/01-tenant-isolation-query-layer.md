# 01 — Tenant isolation not enforced at the query layer

**Severity: Critical** · PRD §7.2, §11, §16.2

## Expected
- Single DB, `tenantId`-discriminated, with **row-level / query-layer enforcement on every query** — "no query may run without a tenant scope when in tenant context" (§7.2).
- §16.2: "Tenant scoping enforced via a **Prisma client extension** that injects `tenantId` on every tenant-scoped model. No raw SQL bypass."
- §11: "Per-tenant data isolation enforced at the query layer; integration tests verify cross-tenant reads/writes are impossible."

## Current state (evidence)
- `lib/db/client.ts` exports a **plain `PrismaClient`** — no `$extends`, no middleware, no tenant injection.
- `lib/db/tenant-context.ts` builds an `AsyncLocalStorage` context (`requireTenantId()`) but **nothing wires it into Prisma**. It is effectively dead infrastructure.
- Isolation is done manually per route, e.g. `app/api/tenant/activity-logs/route.ts`: `where: { tenantId: actor.tenantId, ... }`. Every one of the 11 tenant API routes repeats this by hand.

## Risk
A single forgotten `where: { tenantId }` (or a `findUnique` by id without an ownership check) leaks or mutates another tenant's data. The role-template PATCH already shows the pattern is fragile — it re-checks `existing.tenantId !== actor.tenantId` manually after a global `findUnique`. There is no defence in depth and no test proving isolation.

## Recommendation
1. Implement the mandated Prisma client extension: read `requireTenantId()` from the request context and auto-inject `tenantId` into `where`/`create`/`update`/`delete`/`upsert` for every tenant-scoped model; throw if tenant context is required but absent.
2. Wrap every tenant/client request (API route + server component data fetch) in `runWithContext(...)` so the extension actually has context.
3. Forbid raw SQL on tenant-scoped models (lint rule or wrapper).
4. Add the cross-tenant isolation tests required by §14 (see gap 02).
