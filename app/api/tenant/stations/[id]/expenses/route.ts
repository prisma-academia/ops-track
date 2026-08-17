import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

const CreateExpenseSchema = z.object({
  category: z.enum(["FUEL_FOR_GEN", "MAINTENANCE", "UTILITIES", "STATIONERY", "OTHER"]),
  paymentMethod: z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  receiptUrl: z.string().nullable().optional(),
});

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

    const where = { stationId, tenantId: actor.tenantId };

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
    const body = CreateExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const expense = await prisma.expense.create({
      data: {
        tenantId: actor.tenantId,
        stationId,
        category: body.category,
        paymentMethod: body.paymentMethod,
        amount: body.amount,
        description: body.description,
        receiptUrl: body.receiptUrl,
        recordedById: actor.userId,
        status: "PENDING",
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "expense.record",
      tenantId: actor.tenantId,
      targetType: "Expense",
      targetId: expense.id,
      after: { amount: expense.amount, category: expense.category } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ expense });
  } catch (e) {
    return handleError(e);
  }
}
