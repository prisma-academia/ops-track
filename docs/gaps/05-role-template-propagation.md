# 05 — Role-template change propagation & assignment link missing

**Severity: High** · PRD §5.6, §13, §15

## Expected
- §5.6 / §15: assigning a template copies its permission set; subsequent template edits **propagate to all users assigned that template, with an audit log entry**.
- §13: "User assigned a role template that gets deleted → user falls back to a read-only template until reassigned; audit log entry."

## Current state (evidence)
- `TenantUser`/`PlatformUser` carry only `permissions String[]` — there is **no `roleTemplateId` column**. The link between a user and the template they were assigned is lost at assignment time (apply-role just copies the array).
- `app/api/tenant/role-templates/[id]/route.ts` `PATCH` updates the `RoleTemplate` row and audits the template change, but does **not** update any users' `permissions[]`. No propagation.
- No DELETE handler / fallback-to-read-only behaviour for an assigned template that is removed.

## Risk
Editing a role template has no effect on existing users — admins will believe a permission revocation took effect when it did not (security-relevant). Deleting a template orphans users with stale permissions instead of the mandated read-only fallback.

## Recommendation
1. Add `roleTemplateId` (nullable FK) to `TenantUser` and `PlatformUser`; keep the materialised `permissions[]` as a cache.
2. On role-template `PATCH`, re-copy permissions to all users with that `roleTemplateId` and emit a per-user (or aggregate) audit entry.
3. On role-template delete, reassign affected users to the system **Read-only** template and audit it; block deleting the immutable **Owner** template.
