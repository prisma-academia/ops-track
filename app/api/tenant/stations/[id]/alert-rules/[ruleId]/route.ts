import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateAlertRuleSchema = z.object({
  triggerType: z.enum(["TANK_SHORTAGE", "WAYBILL_SHORTAGE", "STOCK_LEVEL_LOW"]).optional(),
  threshold: z.coerce.number().nullable().optional(),
  priority: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  notifyInApp: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  targetRoles: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

async function resolveRule(stationId: string, ruleId: string, tenantId: string) {
  const rule = await prisma.stationAlertRule.findUnique({ where: { id: ruleId } });
  if (!rule || rule.stationId !== stationId || rule.tenantId !== tenantId) {
    throw new DomainError(404, "not_found", "Alert rule not found.");
  }
  return rule;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, ruleId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key, "STATION");
    const meta = requestMeta(request);

    const existing = await resolveRule(stationId, ruleId, actor.tenantId);
    const body = UpdateAlertRuleSchema.parse(await request.json());

    const updated = await prisma.stationAlertRule.update({
      where: { id: ruleId },
      data: {
        ...body,
        // Ensure threshold is explicitly set to null if passed as null
        threshold: body.threshold !== undefined ? body.threshold : existing.threshold,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "alert_rule.update",
      tenantId: actor.tenantId,
      targetType: "StationAlertRule",
      targetId: ruleId,
      before: existing as object,
      after: updated as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ rule: updated });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; ruleId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, ruleId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key, "STATION");
    const meta = requestMeta(request);

    const existing = await resolveRule(stationId, ruleId, actor.tenantId);

    await prisma.stationAlertRule.delete({ where: { id: ruleId } });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "alert_rule.delete",
      tenantId: actor.tenantId,
      targetType: "StationAlertRule",
      targetId: ruleId,
      before: existing as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
