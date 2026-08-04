import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const ResolveTicketSchema = z.object({
  remark: z.string().min(1, "Remark is required"),
  action: z.enum(["APPROVE", "REJECT"]).default("APPROVE"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    // We assume an owner or someone with appropriate tickets permission can approve
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key); 
    const body = ResolveTicketSchema.parse(await request.json());

    const ticket = await prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Ticket not found.");
    }

    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      throw new DomainError(400, "already_resolved", "Ticket is already resolved.");
    }

    const updated = await prisma.ticket.update({
      where: { id },
      data: {
        status: body.action === "APPROVE" ? "RESOLVED" : "OPEN",
        remark: body.remark,
        approvedById: actor.userId,
      },
    });

    return ok({ ticket: updated });
  } catch (e) {
    return handleError(e);
  }
}
