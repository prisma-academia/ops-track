import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

// PATCH /api/tenant/alert-notifications/[notificationId]/read
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  try {
    await requireCsrf(request);
    const { notificationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");

    const notification = await prisma.alertNotification.findUnique({
      where: { id: notificationId },
    });

    if (
      !notification ||
      notification.tenantId !== actor.tenantId ||
      notification.userId !== actor.userId
    ) {
      throw new DomainError(404, "not_found", "Notification not found.");
    }

    const updated = await prisma.alertNotification.update({
      where: { id: notificationId },
      data: { inAppRead: true },
    });

    return ok({ notification: updated });
  } catch (e) {
    return handleError(e);
  }
}
