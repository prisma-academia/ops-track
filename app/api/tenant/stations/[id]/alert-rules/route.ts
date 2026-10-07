import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateAlertRuleSchema = z.object({
  triggerType: z.enum(["TANK_SHORTAGE", "WAYBILL_SHORTAGE", "STOCK_LEVEL_LOW"]),
  threshold: z.coerce.number().optional().nullable(),
  priority: z.enum(["INFO", "WARNING", "CRITICAL"]).default("WARNING"),
  notifyInApp: z.boolean().default(true),
  notifyEmail: z.boolean().default(false),
  notifySms: z.boolean().default(false),
  targetRoles: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const rules = await prisma.stationAlertRule.findMany({
      where: { stationId, tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
    });

    return ok(rules);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key, "STATION");

    const body = CreateAlertRuleSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const rule = await prisma.stationAlertRule.create({
      data: {
        tenantId: actor.tenantId,
        stationId,
        triggerType: body.triggerType,
        threshold: body.threshold,
        priority: body.priority,
        notifyInApp: body.notifyInApp,
        notifyEmail: body.notifyEmail,
        notifySms: body.notifySms,
        targetRoles: body.targetRoles,
        isActive: body.isActive,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "alert_rule.create",
      tenantId: actor.tenantId,
      targetType: "StationAlertRule",
      targetId: rule.id,
      after: body as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ rule });
  } catch (e) {
    return handleError(e);
  }
}
