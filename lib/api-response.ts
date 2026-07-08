/**
 * Canonical API response envelope.
 *
 * Every API route MUST return this shape — use the `ok()` / `fail()` helpers
 * in `lib/api/respond.ts` on the server side. On the client side, the
 * `apiGet/apiPost/…` functions in `lib/client/api.ts` parse this type.
 */
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  message: string;
  meta?: Record<string, unknown>;
}

/** Build a success payload (plain object — no NextResponse). */
export function success<T>(data: T, message = "Success"): ApiResponse<T> {
  return { ok: true, data, message };
}

/** Build a failure payload (plain object — no NextResponse). */
export function failure(message: string): ApiResponse<null> {
  return { ok: false, data: null, message };
}
