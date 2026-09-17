import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z.object({
  status:             z.enum(["PENDING","CONTACTED","NEGOTIATING","CONVERTED","LOST"]).optional(),
  reviewNotes:        z.string().max(2000).optional(),
  assignedTo:         z.string().optional(),
  scheduledAt:        z.string().datetime().optional().nullable(),
  convertedToTenantId: z.string().optional().nullable(),
});

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_READ.key);
    const { id } = await ctx.params;
    const row = await prisma.demoRequest.findUnique({ where: { id } });
    if (!row) throw new DomainError(404, "not_found", "Demo request not found.");
    return ok(row);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const { id } = await ctx.params;
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.demoRequest.findUnique({ where: { id } });
    if (!existing) throw new DomainError(404, "not_found", "Demo request not found.");

    const updated = await prisma.demoRequest.update({
      where: { id },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.reviewNotes !== undefined ? { reviewNotes: body.reviewNotes } : {}),
        ...(body.assignedTo !== undefined ? { assignedTo: body.assignedTo } : {}),
        ...(body.scheduledAt !== undefined ? { scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null } : {}),
        ...(body.convertedToTenantId !== undefined ? { convertedToTenantId: body.convertedToTenantId } : {}),
        reviewedAt: new Date(),
      },
    });

    await audit({
      actorType: "PLATFORM_USER", actorId: actor.userId,
      action: "demo_request.update", tenantId: null,
      targetType: "DemoRequest", targetId: id,
      before: { status: existing.status },
      after: { status: updated.status },
      ip: meta.ip, userAgent: meta.userAgent,
    });

    return ok({ demoRequest: updated });
  } catch (e) {
    return handleError(e);
  }
}