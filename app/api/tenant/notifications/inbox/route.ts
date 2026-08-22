import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";

export async function GET() {
  try {
    const actor = await requireTenantActor();

    const items = await prisma.notificationDelivery.findMany({
      where: {
        tenantId: actor.tenantId,
        userId: actor.userId,
        channel: "IN_APP",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        message: {
          select: {
            id: true,
            title: true,
            body: true,
            module: true,
            createdAt: true,
            sentAt: true,
          },
        },
      },
    });

    const unreadCount = items.filter((item) => !item.readAt).length;
    return ok({ items, unreadCount });
  } catch (e) {
    return handleError(e);
  }
}
