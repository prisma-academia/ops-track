import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireClientActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateDriverSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(5).max(30),
  licenseNumber: z.string().max(50).optional().nullable(),
});

export async function GET() {
  try {
    const actor = await requireClientActor();
    const drivers = await prisma.clientDriver.findMany({
      where: { clientId: actor.clientId, tenantId: actor.tenantId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ drivers });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireClientActor();
    const body = CreateDriverSchema.parse(await request.json());

    const driver = await prisma.clientDriver.create({
      data: {
        tenantId: actor.tenantId,
        clientId: actor.clientId,
        fullName: body.fullName.trim(),
        phone: body.phone.trim(),
        licenseNumber: body.licenseNumber?.trim() || null,
      },
    });

    return ok({ driver });
  } catch (e) {
    return handleError(e);
  }
}
