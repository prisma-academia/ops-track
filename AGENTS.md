<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Role assignment is copy-at-assignment (by design)

Applying a role template copies its filtered permission set into the user's
`permissions[]` at assignment time (`/api/{tenant,platform}/users/[id]/apply-role`).
This is intentional and **non-propagating**: later edits to a role template do
NOT retroactively update users already assigned that template. Do not add
template→user propagation without an explicit product decision.

# Tenant data isolation

Tenant-scoped Prisma access is guarded by a client extension
(`lib/db/extension.ts`) that injects `tenantId` from the request context
(`lib/db/tenant-context.ts`). Request handlers bind context via the auth guards
(`enterContext`) or, for pages, `lib/db/page-context.ts`. It fails closed: a
tenant-scoped query with no bound context throws. Scripts that need
cross-tenant access use the un-extended `lib/db/raw-client.ts`.
