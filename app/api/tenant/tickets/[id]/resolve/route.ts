import { z } from "zod";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { resolveTicket } from "@/lib/tickets/ticket-service";

const ResolveTicketSchema = z.object({
  remark: z.string().min(1, "Remark is required"),
  action: z.enum(["APPROVE", "REJECT"]).default("APPROVE"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_TICKETS_WRITE.key, "STATION");
    const body = ResolveTicketSchema.parse(await request.json());

    const ticket = await resolveTicket({
      ticketId: id,
      tenantId: actor.tenantId,
      actorUserId: actor.userId,
      action: body.action,
      remark: body.remark,
    });

    return ok({ ticket });
  } catch (e) {
    return handleError(e);
  }
}
