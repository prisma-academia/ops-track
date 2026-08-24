import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";


export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_EXPENSES_READ.key, "STATION");
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    const stationId = url.searchParams.get("stationId") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const paymentMethod = url.searchParams.get("paymentMethod") || undefined;
    const amountMin = url.searchParams.get("amountMin") ? Number(url.searchParams.get("amountMin")) : undefined;
    const amountMax = url.searchParams.get("amountMax") ? Number(url.searchParams.get("amountMax")) : undefined;
    const dateStart = url.searchParams.get("dateStart") ? new Date(url.searchParams.get("dateStart") as string) : undefined;
    const dateEnd = url.searchParams.get("dateEnd") ? new Date(url.searchParams.get("dateEnd") as string) : undefined;

    const include = {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      ticket: {
        select: { id: true, title: true, status: true, category: true },
      },
    };

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.expense.count({
          where: {
            tenantId: actor.tenantId,
            status: "APPROVED",
            ...(stationId ? { stationId } : {}),
            ...(category ? { category: category as any } : {}),
            ...(paymentMethod ? { paymentMethod: paymentMethod as any } : {}),
            ...(amountMin !== undefined || amountMax !== undefined ? { amount: { gte: amountMin, lte: amountMax } } : {}),
            ...(dateStart || dateEnd ? { createdAt: { gte: dateStart, lte: dateEnd } } : {}),
          },
        }),
        prisma.expense.findMany({
          where: {
            tenantId: actor.tenantId,
            status: "APPROVED",
            ...(stationId ? { stationId } : {}),
            ...(category ? { category: category as any } : {}),
            ...(paymentMethod ? { paymentMethod: paymentMethod as any } : {}),
            ...(amountMin !== undefined || amountMax !== undefined ? { amount: { gte: amountMin, lte: amountMax } } : {}),
            ...(dateStart || dateEnd ? { createdAt: { gte: dateStart, lte: dateEnd } } : {}),
          },
          orderBy: { createdAt: "desc" },
          take,
          skip,
          include,
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
  
      const rows = await prisma.expense.findMany({
        where: {
          tenantId: actor.tenantId,
          status: "APPROVED",
          ...(stationId ? { stationId } : {}),
          ...(category ? { category: category as any } : {}),
          ...(paymentMethod ? { paymentMethod: paymentMethod as any } : {}),
          ...(amountMin !== undefined || amountMax !== undefined ? { amount: { gte: amountMin, lte: amountMax } } : {}),
          ...(dateStart || dateEnd ? { createdAt: { gte: dateStart, lte: dateEnd } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include,
      });
  
      return ok(rows, buildPageMeta(rows, take));
    }
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    await requireTenantActor(PERMISSIONS.TENANT_EXPENSES_WRITE.key, "STATION");
    throw new DomainError(
      400,
      "use_tickets",
      "Create a ticket first. Station expenses are paid out from the ticket inbox.",
    );
  } catch (e) {
    return handleError(e);
  }
}
