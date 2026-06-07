# 02 — No automated tests

**Severity: Critical** · PRD §14, §16.10

## Expected
- §16.10 locked stack: `vitest` + `@vitest/coverage-v8` (unit/integration), `playwright` (E2E), `@faker-js/faker` (test data).
- §14 acceptance: "Cross-tenant data access is impossible … **verified by automated tests**."
- §11: "integration tests verify cross-tenant reads/writes are impossible."

## Current state (evidence)
- `package.json` contains **none** of `vitest`, `@vitest/coverage-v8`, `playwright`, `@faker-js/faker`.
- No `test`/`e2e` npm scripts. No `*.test.ts`, `*.spec.ts`, `tests/`, `e2e/`, or Playwright/Vitest config files anywhere in the repo.

## Risk
Every PRD acceptance criterion is unverified. The critical isolation guarantee (gap 01) is asserted only by manual `where` clauses with nothing proving they hold or stay holding under refactor.

## Recommendation
1. Install the locked test stack and add `test`, `test:coverage`, `e2e` scripts.
2. Priority test suites:
   - **Cross-tenant isolation** (integration): Tenant A actor cannot read/update/delete any Tenant B row across all tenant endpoints.
   - **Auth flows**: first-login force-password-change, admin reset → session revocation, OTP issue/verify/expiry/attempts/rate-limit.
   - **Permission checks**: Owner / Super-Admin bypass, missing-permission → 403.
   - **Middleware**: subdomain resolution, unknown tenant → 404, auth redirects.
   - **E2E (Playwright)**: tenant create → owner invite → first login → staff invite → client OTP onboarding.
