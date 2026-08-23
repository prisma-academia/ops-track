import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

const CreateExpenseSchema = z.object({
  stationId: z.string().min(1),
  category: z.enum(["FUEL_FOR_GEN", "MAINTENANCE", "UTILITIES", "STATIONERY", "OTHER"]),
  paymentMethod: z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(1).max(500),
  receiptUrl: z.string().optional().nullable(),
  bankAccountId: z.string().optional(),
});

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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_EXPENSES_WRITE.key, "STATION");
    const body = CreateExpenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: body.stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    if (body.paymentMethod !== "CASH" && !body.bankAccountId) {
      throw new DomainError(400, "invalid_input", "Bank account is required for non-cash payments.");
    }

    const expense = await prisma.expense.create({
      data: {
        tenantId: actor.tenantId,
        stationId: body.stationId,
        category: body.category,
        paymentMethod: body.paymentMethod,
        amount: body.amount,
        description: body.description,
        receiptUrl: body.receiptUrl ?? null,
        bankAccountId: body.bankAccountId,
        recordedById: actor.userId,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "expense.record",
      tenantId: actor.tenantId,
      targetType: "Expense",
      targetId: expense.id,
      after: { amount: expense.amount, category: expense.category, stationId: expense.stationId } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ expense });
  } catch (e) {
    return handleError(e);
  }
}
