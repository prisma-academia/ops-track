import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

/** Reviews must target a single POS or transfer payment, not the whole sale. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; salesLogId: string }> }
) {
  try {
    await requireCsrf(request);
    await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key, "STATION");
    await params;
    throw new DomainError(
      400,
      "review_per_payment",
      "Approve or reject each POS or transfer payment individually, not the whole sales report.",
    );
  } catch (e) {
    return handleError(e);
  }
}
