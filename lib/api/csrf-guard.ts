import { verifyCsrf } from "@/lib/auth/csrf";
import { DomainError } from "./errors";

export async function requireCsrf(request: Request): Promise<void> {
  // Mobile apps and API clients using custom headers are not susceptible to browser-based CSRF
  // because browsers require a CORS preflight to send custom headers.
  if (request.headers.get("x-mobile-app") === "1") {
    return;
  }
  const ok = await verifyCsrf(request);
  if (!ok) throw new DomainError(403, "csrf", "CSRF verification failed.");
}
