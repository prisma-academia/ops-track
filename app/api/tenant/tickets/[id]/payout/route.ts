import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { payoutTicket } from "@/lib/tickets/ticket-service";
import { PayoutTicketSchema } from "@/lib/tickets/schemas";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_WRITE.key, "STATION");
    const body = PayoutTicketSchema.parse(await request.json());

    const ticket = await payoutTicket({
      ticketId: id,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      paymentMethod: body.paymentMethod,
      bankAccountId: body.bankAccountId,
      amount: body.amount,
      receiptUrl: body.receiptUrl,
      description: body.description,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}
