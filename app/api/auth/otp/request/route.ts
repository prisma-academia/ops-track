import { z } from "zod";
import { headers } from "next/headers";
import { resolveHost, resolveTenantFromHeaders } from "@/lib/auth/context";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { handleError, DomainError } from "@/lib/api/errors";

const Body = z.object({ email: z.email() });

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    Body.parse(await request.json());
    const h = await headers();
    const xTenantSlug = h.get("x-tenant-slug");
    const ctx = resolveTenantFromHeaders(h.get("host"), xTenantSlug);
    if (ctx.mode !== "tenant") {
      throw new DomainError(400, "no_tenant", "OTP is only available in tenant context.");
    }
    throw new DomainError(
      410,
      "otp_removed",
      "Email code sign-in is no longer available. Use email and password, or register for a new account."
    );
  } catch (e) {
    return handleError(e);
  }
}
