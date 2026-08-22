import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { dispatchNotificationMessage } from "@/lib/notifications/dispatch";
import { notificationPermission } from "@/lib/notifications/permissions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor();

    const existing = await prisma.notificationMessage.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Notification not found.");
    }

    await requireTenantActor(notificationPermission(existing.module, true), existing.module);

    if (existing.status === "SENT") {
      throw new DomainError(400, "already_sent", "This notification has already been sent.");
    }

    const message = await dispatchNotificationMessage(existing);
    const meta = requestMeta(request);
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "notification.send",
      tenantId: actor.tenantId,
      targetType: "NotificationMessage",
      targetId: message.id,
      after: { title: message.title, status: message.status } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ message });
  } catch (e) {
    return handleError(e);
  }
}
