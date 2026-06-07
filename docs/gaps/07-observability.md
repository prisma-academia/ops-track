# 07 — Observability (tracing, metrics, error reporting) missing

**Severity: Medium** · PRD §6, §16.7

## Expected
- §16.7: `pino` + `pino-pretty`, `@opentelemetry/api` + `@opentelemetry/sdk-node`, `@sentry/nextjs`.
- §6: structured logs, request tracing, **metrics on auth events and audit-log writes**.

## Current state (evidence)
- `pino` + `pino-pretty` present (`lib/logger.ts`). ✅
- `@opentelemetry/*` and `@sentry/nextjs` **not in `package.json`**. No `instrumentation.ts`, no Sentry config, no tracing or metrics emitted on auth/audit paths.

## Risk
No request tracing, no auth/audit metrics, no server/client error reporting — the §6 observability NFR and §11 "metrics on auth events and audit log writes" are unmet. Production incidents would be near-undiagnosable.

## Recommendation
1. Install `@opentelemetry/api` + `@opentelemetry/sdk-node`; add `instrumentation.ts` (Next.js instrumentation hook) and emit spans/metrics around `login`, `otp`, `change-password`, session issuance, and `audit()` writes.
2. Install `@sentry/nextjs`; wire server + client configs and the existing `app/global-error.tsx`.
3. Ensure `pino` emits JSON in prod and there is no committed `console.log` (per §16.7).
