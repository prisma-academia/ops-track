# 10 — Tenant template management is read-only

**Severity: Medium** · PRD §4, §5, §7.1

## Expected
- §4 Tenant Admin layer: "Template management (tenant-scoped configurable templates)."
- §7.1 `Template` entity: id, tenantId, type, name, contentJson — managed per tenant.

## Current state (evidence)
- `app/admin/(dashboard)/templates/page.tsx` only **lists** templates (`prisma.template.findMany`). There is no create/edit/delete UI.
- No API route exists for tenant templates (no `app/api/tenant/templates/...`). The `Template` model is effectively unmanageable through the app — read-only display of rows that nothing can create.
- `app/admin/(dashboard)/role-templates/...` (role/permission templates) is implemented; the generic content `Template` is not.

## Risk
A documented tenant module is non-functional (empty by construction). §14 states "No placeholder pages, no TODO stubs" — a list view with no way to add data is effectively a placeholder.

## Recommendation
1. Add `GET/POST/PATCH/DELETE /api/tenant/templates` with Zod validation, permission checks (`tenant.templates:write`), tenant scoping, and audit entries.
2. Add create/edit UI under `app/admin/(dashboard)/templates/`.
3. Define the concrete `type`s a tenant template can be (this is an open question in §15 — resolve it before shipping the module).
