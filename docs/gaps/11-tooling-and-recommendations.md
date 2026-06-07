# 11 — Tooling gaps & optional recommendations

**Severity: Low** · PRD §16.10, §15

## Tooling gaps (locked stack not satisfied)
- **Prettier missing**: §16.10 mandates `prettier` + `prettier-plugin-tailwindcss` (Tailwind class sorting enforced). Neither is in `package.json`; no `.prettierrc`.
- **Test tooling**: see gap 02 (vitest/playwright/faker/coverage).
- **Middleware filename**: §16.4 names `lib/auth/middleware.ts`; logic lives in root `proxy.ts`. Acceptable for this Next version's convention but worth a note/alias for spec alignment.
- Confirm no committed `console.log` (per §16.7) once logger usage is audited.

## Optional recommendations (PRD §15 — not yet implemented)
These are explicitly "recommended" / open in the PRD, not hard requirements. Listed so they are tracked, not lost:

- **MFA (TOTP)** for Platform users and Tenant Owners — must be hand-rolled with `node:crypto` (no `otplib`/`speakeasy` per §16.11).
- **Platform Super-Admin impersonation mode** (audited) for support.
- **Outbound webhooks** for tenant lifecycle events (created/suspended/archived).
- **CLI / scripting interface** for bulk tenant provisioning.
- **Permission-discovery endpoint** so the front-end can render permitted nav dynamically (currently nav is static).

## Open questions to resolve before GA (PRD §15)
- Modules beyond Users/Clients/Roles/Activity/Templates/Settings?
- Concrete `Template` types (blocks gap 10).
- Client auth: OTP-only vs. optional email+password (schema has `Client.passwordHash`, implying password support — reconcile with §5.5 OTP-only flow).
- Billing/subscription layer? Tenant API keys? Per-user notification preferences? Launch languages?

## Recommendation
Add Prettier + the test stack now (cheap, high leverage). Triage §15 recommendations into the roadmap; close the open questions with the product owner before declaring the PRD met.
