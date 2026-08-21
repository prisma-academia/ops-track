import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

const CreateFleetExpenseSchema = z.object({
  category: z.enum(["FUEL_FOR_GEN", "MAINTENANCE", "UTILITIES", "STATIONERY", "OTHER", "SALARY"]),
  paymentMethod: z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  receiptUrl: z.string().nullable().optional(),
  truckId: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_LEDGER_READ.key, "FLEET");
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    const truckId = url.searchParams.get("truckId");

    const where: any = {
      tenantId: actor.tenantId,
      context: "FLEET",
    };

    if (truckId) {
      where.truckId = truckId;
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
            truck: { select: { name: true, plateNumber: true } },
          },
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    }

    const expenses = await prisma.expense.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        truck: { select: { name: true, plateNumber: true } },
      },
    });

    return ok(expenses);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_LEDGER_WRITE.key, "FLEET");
    const body = CreateFleetExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    const expense = await prisma.expense.create({
      data: {
        tenantId: actor.tenantId,
        context: "FLEET",
        category: body.category as any,
        paymentMethod: body.paymentMethod,
        amount: body.amount,
        description: body.description,
        receiptUrl: body.receiptUrl,
        recordedById: actor.userId,
        status: "PENDING",
        truckId: body.truckId || null,
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "fleet_expense.record",
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
