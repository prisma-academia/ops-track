import { ensureCsrfToken } from "@/lib/auth/csrf";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";

export async function GET() {
  try {
    const token = await ensureCsrfToken();
    return ok({ csrfToken: token });
  } catch (e) {
    return handleError(e);
  }
}
