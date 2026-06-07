# 09 — Activity-log filtering & retention incomplete

**Severity: Medium** · PRD §5.7, §11

## Expected
- §5.7: logs filterable by **user, action type, date range, module**; retention **7 years (configurable per tenant)**; append-only.
- §11: audit-log writes **transactional with the action** (both commit or neither); no update/delete endpoints.

## Current state (evidence)
- `app/api/tenant/activity-logs/route.ts` filters by **`action` only** — no user, date-range, or module filter. Platform `activity-logs` route likely the same (verify).
- `lib/auth/audit.ts` `audit()` does a standalone `prisma.activityLog.create()` — it is **not in the same transaction** as the state-changing action it records. On partial failure the action and its audit row can diverge (§11 requires atomicity).
- No retention policy/job and no per-tenant retention config. Append-only is satisfied de facto (no update/delete endpoints), which is good.

## Risk
- Compliance/forensics queries (§5.7) can't be answered (no who/when/module filtering).
- §11 transactional-audit guarantee is violated: an action can succeed while its audit write fails (or vice versa), breaking traceability.

## Recommendation
1. Extend the activity-log query API with `actorId`, `from`/`to` (date range), and `module` filters plus the documented cursor pagination.
2. Make `audit()` accept a Prisma transaction client and call it inside the same `prisma.$transaction([...])` as the mutating write.
3. Add a configurable retention setting + a scheduled purge job (default 7 years).
