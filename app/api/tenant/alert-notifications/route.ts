import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const where = {
      tenantId: actor.tenantId,
      userId: actor.userId,
      ...(unreadOnly ? { inAppRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.alertNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.alertNotification.count({ where }),
      prisma.alertNotification.count({
        where: { tenantId: actor.tenantId, userId: actor.userId, inAppRead: false },
      }),
    ]);

    return ok({ notifications, total, unreadCount, page, limit });
  } catch (e) {
    return handleError(e);
  }
}
