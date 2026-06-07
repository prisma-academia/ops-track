# 04 — Suspended/archived tenants still served; slug quarantine unverified

**Severity: High** · PRD §4, §11, §13

## Expected
- §13: "Tenant suspended → all tenant users and clients see a maintenance/blocked screen; platform admins can still operate."
- §4: tenant lifecycle = create, **suspend, archive, restore**.
- §11/§13: archived tenant slug quarantined for **90 days** before re-use.

## Current state (evidence)
- `app/maintenance/page.tsx` exists, but `proxy.ts` (middleware) **never checks tenant `status`**. `resolveHost` only resolves slug → tenant; a `SUSPENDED`/`ARCHIVED` tenant's users and clients are still routed straight to dashboards/auth.
- `Tenant.status` (`ACTIVE|SUSPENDED|ARCHIVED`) and `ReservedSlug` model exist in `schema.prisma`, and `archivedAt` is present — but enforcement of the maintenance redirect and the 90-day quarantine on slug reuse is not wired through middleware/tenant-create.

## Risk
A suspended tenant continues operating normally — the suspension control is cosmetic. Archived slugs may be reusable immediately, enabling subdomain takeover (§11 explicitly prohibits this).

## Recommendation
1. In middleware, after resolving the tenant: if `status !== ACTIVE`, rewrite tenant/client routes to `/maintenance` while still allowing the platform context to operate.
2. On tenant archive, write a `ReservedSlug` row (reason + timestamp); on tenant create, reject a slug present in `ReservedSlug` whose quarantine (90 days from `archivedAt`) has not elapsed — with a `409`.
3. Add restore flow (ARCHIVED/SUSPENDED → ACTIVE) with an audit entry.
4. Cover all three transitions with tests (gap 02).
