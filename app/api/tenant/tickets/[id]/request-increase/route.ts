import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { requestTicketIncrease } from "@/lib/tickets/ticket-service";
import { RequestIncreaseSchema } from "@/lib/tickets/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_WRITE.key, "STATION");
    const body = RequestIncreaseSchema.parse(await request.json());

    const ticket = await requestTicketIncrease({
      ticketId: id,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      newRequestedAmount: body.newRequestedAmount,
      reason: body.reason,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}
