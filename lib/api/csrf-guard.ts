import { verifyCsrf } from "@/lib/auth/csrf";
import { DomainError } from "./errors";

export async function requireCsrf(request: Request): Promise<void> {
  const ok = await verifyCsrf(request);
  if (!ok) throw new DomainError(403, "csrf", "CSRF verification failed.");
}
