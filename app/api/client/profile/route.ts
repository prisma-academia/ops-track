import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireClientActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const PatchBody = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  displayName: z.string().min(1).max(200),
});

export async function PATCH(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireClientActor();
    const body = PatchBody.parse(await request.json());
    const meta = requestMeta(request);

    const client = await prisma.client.findUnique({ where: { id: actor.clientId } });
    if (!client) throw new DomainError(404, "not_found", "Client not found.");

    const prev = client.profileJson as Record<string, unknown>;
    const profileJson = {
      ...prev,
      name: body.displayName.trim(),
    };

    const updated = await prisma.client.update({
      where: { id: actor.clientId },
      data: {
        firstName: body.firstName?.trim() || null,
        lastName: body.lastName?.trim() || null,
        phone: body.phone?.trim() || null,
        profileJson,
      },
    });

    await audit({
      actorType: "CLIENT",
      actorId: actor.clientId,
      action: "client.profile_update",
      tenantId: actor.tenantId,
      targetType: "Client",
      targetId: actor.clientId,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ client: { id: updated.id, profileJson: updated.profileJson } });
  } catch (e) {
    return handleError(e);
  }
}
