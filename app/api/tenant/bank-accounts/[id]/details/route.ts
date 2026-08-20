import { requireTenantActor, PERMISSIONS, AuthError } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/auth/permissions";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { getBankAccountDetailsData } from "@/lib/bank-accounts/bank-account-details";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireTenantActor();
    const { id } = await params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "25", 10);

    const details = await getBankAccountDetailsData({
      tenantId: actor.tenantId,
      bankAccountId: id,
      page,
      pageSize,
    });

    if (!details) {
      throw new DomainError(404, "not_found", "Bank account not found.");
    }

    const canReadFleet = hasPermission(actor, PERMISSIONS.TENANT_FLEET_BANK_ACCOUNTS_READ.key);
    const canReadStation = hasPermission(actor, PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key);
    const canViewAccount =
      details.account.scope === "FLEET" ? canReadFleet : canReadStation || canReadFleet;
    if (!canViewAccount) {
      throw new AuthError(403, "Forbidden.");
    }

    return ok(details);
  } catch (e) {
    return handleError(e);
  }
}
