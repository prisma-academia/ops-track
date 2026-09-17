import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireTenantActor } from "@/lib/auth/guards";
import { fetchBanks } from "@/lib/paystack";

export async function GET(request: Request) {
  try {
    await requireTenantActor();
    const banks = await fetchBanks();
    return ok(banks);
  } catch (e) {
    return handleError(e);
  }
}
