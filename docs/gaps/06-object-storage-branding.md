# 06 — Object storage & tenant branding/settings missing

**Severity: Medium** · PRD §5.8, §8.3, §16.6

## Expected
- §5.8 tenant settings: name, **logo**, contact email, **branding (primary color)**, **timezone**, **locale**, **default currency**, **module enable/disable flags**.
- §8.3 / §16.6: object storage via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for tenant logos/assets.

## Current state (evidence)
- `@aws-sdk/client-s3` / `@aws-sdk/s3-request-presigner` **not in `package.json`**. No upload endpoint, no presign helper.
- `Tenant` has discrete company fields plus a generic `settingsJson Json` blob; there is no logo storage, no structured branding/timezone/locale/currency, and no module enable/disable flag model. `app/api/tenant/settings/route.ts` exists but cannot cover logo upload without storage.

## Risk
Tenant branding, per-tenant timezone/locale/currency, and module gating (which modules clients/staff see) cannot be delivered. This also blocks the i18n per-tenant locale requirement (gap 08) and the §5.8 module-flag behaviour.

## Recommendation
1. Install the AWS S3 SDK packages; add a presigned-upload endpoint + env config (S3-compatible endpoint supported).
2. Define a typed tenant-settings schema (Zod) for logo key, primaryColor, timezone, locale, currency, and `enabledModules`.
3. Enforce `enabledModules` in nav/route rendering for tenant staff and clients.
