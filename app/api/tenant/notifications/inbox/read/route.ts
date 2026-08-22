import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const BodySchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const body = BodySchema.parse(await request.json().catch(() => ({})));

    const where = {
      tenantId: actor.tenantId,
      userId: actor.userId,
      channel: "IN_APP" as const,
      readAt: null,
      ...(body.id && !body.all ? { id: body.id } : {}),
    };

    const result = await prisma.notificationDelivery.updateMany({
      where,
      data: { readAt: new Date() },
    });

    return ok({ updated: result.count });
  } catch (e) {
    return handleError(e);
  }
}
