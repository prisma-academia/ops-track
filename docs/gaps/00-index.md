# Gap Analysis — Multi-Tenant SaaS Platform

Review date: 2026-05-15. Baseline: `prd.md` vs. current `master` (`4ab18e0`).

## Verdict

Core happy-path flows exist (auth, sessions, OTP, role templates, audit write, subdomain routing). The implementation is **not production-ready** against the PRD. The dominant risk is **tenant isolation enforced by hand in every route** instead of at the query layer as the PRD mandates, with **zero automated tests** to prove isolation holds. Several locked-stack infrastructure libraries (rate limiting, object storage, observability, i18n, test tooling) are simply absent.

## Severity index

| # | Gap | Severity | File |
|---|-----|----------|------|
| 01 | Tenant isolation not enforced at the query layer | Critical | [01](01-tenant-isolation-query-layer.md) |
| 02 | No automated tests (incl. cross-tenant isolation) | Critical | [02](02-no-automated-tests.md) |
| 03 | Rate-limiting infrastructure missing | High | [03](03-rate-limiting.md) |
| 04 | Suspended/archived tenants still served | High | [04](04-tenant-lifecycle-enforcement.md) |
| 05 | Role-template change propagation missing | High | [05](05-role-template-propagation.md) |
| 06 | Object storage / tenant branding missing | Medium | [06](06-object-storage-branding.md) |
| 07 | Observability (OTel + Sentry) missing | Medium | [07](07-observability.md) |
| 08 | i18n / localisation missing | Medium | [08](08-i18n-localisation.md) |
| 09 | Activity-log filtering & retention incomplete | Medium | [09](09-activity-log-filtering-retention.md) |
| 10 | Template management is read-only | Medium | [10](10-template-management.md) |
| 11 | Tooling & optional recommendations | Low | [11](11-tooling-and-recommendations.md) |

Each file is self-contained: PRD reference, expected behaviour, current evidence, recommendation.
