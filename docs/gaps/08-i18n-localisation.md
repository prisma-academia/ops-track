# 08 — i18n / localisation missing

**Severity: Medium** · PRD §6, §16.8

## Expected
- §6: "All user-facing text translatable; per-tenant locale."
- §16.8: `next-intl` for i18n; `date-fns-tz` for tenant timezone handling.

## Current state (evidence)
- `next-intl` **not in `package.json`**. `date-fns` + `date-fns-tz` are present but timezone is not applied per tenant (no tenant locale/timezone in settings — see gap 06).
- All UI strings are hardcoded English literals across `app/**` (page headers, table labels, error copy, email subjects in `lib/auth/otp.ts`).

## Risk
The localisation NFR is unmet; retrofitting i18n after the UI is built is costly. Per-tenant locale (§5.8) cannot be honoured.

## Recommendation
1. Install `next-intl`; introduce a message catalogue and wrap the app with the provider.
2. Resolve active locale from tenant settings → user preference → `Accept-Language` fallback.
3. Localise email templates and date/number formatting (via `date-fns` locale + `date-fns-tz` with the tenant timezone).
