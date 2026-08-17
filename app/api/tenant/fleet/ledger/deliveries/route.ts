import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key, "FLEET");
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const customerId = url.searchParams.get("customerId");

    const rows = await prisma.transaction.findMany({
      where: {
        tenantId: actor.tenantId,
        category: "CLIENT_PAYMENT",
        ...(customerId ? { delivery: { customerId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        delivery: {
          include: { customer: true, station: true },
        },
      },
    });

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}
