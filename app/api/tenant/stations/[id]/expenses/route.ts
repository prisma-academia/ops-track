import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(undefined, "STATION");
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: { staff: true },
    });
    
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const statusFilter = url.searchParams.get("status") || undefined;

    const where: any = { stationId, tenantId: actor.tenantId };
    if (statusFilter) {
      where.status = statusFilter;
    }

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.expense.count({ where }),
        prisma.expense.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          skip,
          include: {
            recordedBy: { select: { firstName: true, lastName: true } },
            approvedBy: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return ok(expenses);
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
    const actor = await requireTenantActor(undefined, "STATION");
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const body = await request.json();
    const { amount, category, description, paymentMethod } = body;

    if (!amount || !category || !description || !paymentMethod) {
      throw new DomainError(400, "invalid_input", "Missing required fields.");
    }

    const expense = await prisma.expense.create({
      data: {
        tenantId: actor.tenantId,
        stationId,
        context: "STATION",
        amount: Number(amount),
        category,
        description,
        paymentMethod,
        status: "PENDING",
        recordedById: actor.userId,
      },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
      },
    });

    return ok(expense);
  } catch (e) {
    return handleError(e);
  }
}
