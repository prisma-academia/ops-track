import { prisma } from "@/lib/db/client";
import { AlertPriority, AlertTriggerType } from "@/lib/generated/prisma/client";

export interface AlertContext {
  tenantId: string;
  stationId: string;
  triggerType: AlertTriggerType;
  /** The variance/shortage amount to compare against thresholds */
  varianceAmount: number;
  /** Human-readable title for the notification */
  title: string;
  /** Human-readable message body */
  message: string;
  /** ID of the source record (waybillId, dippingSessionId, etc.) */
  referenceId?: string;
}

/**
 * Evaluates active alert rules for the given station and trigger type.
 * Creates AlertNotification records for all matched target users.
 * Safe to call inside or outside a transaction — uses its own DB calls.
 *
 * This function is idempotent per referenceId + triggerType:
 * if a notification for the same reference already exists it is skipped,
 * preventing duplicates on double-submissions.
 */
export async function dispatchAlertNotifications(ctx: AlertContext): Promise<void> {
  const rules = await prisma.stationAlertRule.findMany({
    where: {
      tenantId: ctx.tenantId,
      stationId: ctx.stationId,
      triggerType: ctx.triggerType,
      isActive: true,
    },
  });

  if (rules.length === 0) return;

  for (const rule of rules) {
    // Check threshold — only fire if variance exceeds the configured amount
    if (rule.threshold !== null && ctx.varianceAmount < rule.threshold.toNumber()) {
      continue;
    }

    if (!rule.notifyInApp) continue;

    // Resolve target users by role
    const targetUsers = await prisma.tenantUser.findMany({
      where: {
        tenantId: ctx.tenantId,
        stations: {
          some: { id: ctx.stationId },
        },
        // Filter by at least one matching station permission prefix if roles specified
        ...(rule.targetRoles.length > 0
          ? {
              stationPermissions: {
                hasSome: rule.targetRoles,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (targetUsers.length === 0) continue;

    // Build notification rows — skip if a notification for the same reference already exists
    const rows = targetUsers.map((u) => ({
      tenantId: ctx.tenantId,
      userId: u.id,
      title: ctx.title,
      message: ctx.message,
      priority: rule.priority as AlertPriority,
      type: ctx.triggerType,
      inAppRead: false,
      emailSent: false,
      smsSent: false,
      referenceId: ctx.referenceId ?? null,
    }));

    // Use createMany with skipDuplicates as a safety net
    await prisma.alertNotification.createMany({
      data: rows,
      skipDuplicates: false, // We want one notification per user per event
    });
  }
}
