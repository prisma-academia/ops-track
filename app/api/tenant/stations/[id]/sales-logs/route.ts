import { requireCsrf } from "@/lib/api/csrf-guard";
import { DomainError, handleError } from "@/lib/api/errors";
import { buildOffsetPageMeta, parseOffsetPagination } from "@/lib/api/pagination";
import { ok } from "@/lib/api/respond";
import { audit, requestMeta } from "@/lib/auth/audit";
import { requireTenantActor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { StockMovementService } from "@/lib/inventory/stock-movement-service";
import { reconcileTankCurrentLiters } from "@/lib/inventory/tank-balance";
import { FinanceService } from "@/lib/finance/finance-service";
import { assertBankAccountsUsableForStation } from "@/lib/bank-accounts/assert-usable";
import {
  computeStationOverpayment,
  firstBankIds,
  resolvePaymentInputs,
  salesPaymentInclude,
  sumsFromPayments,
  validatePaymentInputs,
} from "@/lib/sales/payments";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PaymentInputSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().nullable().optional(),
  method: z.enum(["POS", "TRANSFER"]),
  amount: z.coerce.number().min(0),
  bankAccountId: z.string(),
  receiptUrl: z.string().nullable().optional(),
});

const CreateSalesLogSchema = z.object({
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersSold: z.coerce.number().min(0),
  pricePerLiter: z.coerce.number().min(0).default(0),
  amountPos: z.coerce.number().min(0).optional(),
  amountTransfer: z.coerce.number().min(0).optional().default(0),
  posBankAccountId: z.string().nullable().optional(),
  transferBankAccountId: z.string().nullable().optional(),
  posReceiptUrl: z.string().nullable().optional(),
  transferReceiptUrl: z.string().nullable().optional(),
  payments: z.array(PaymentInputSchema).optional(),
  appliedCredit: z.coerce.number().min(0).optional().default(0),
  logDate: z.string().optional(),
  dippingClosingId: z.string().optional(),
  clientId: z.string().optional(),
  isDebtRepayment: z.boolean().optional().default(false),
  parentSaleId: z.string().nullable().optional(),
});

function serializeSalesLog<T extends { parentdeliveryId?: string | null }>(log: T) {
  return {
    ...log,
    parentSaleId: log.parentdeliveryId ?? null,
  };
}

const salesLogInclude = {
  recordedBy: { select: { firstName: true, lastName: true } },
  posBankAccount: { select: { id: true, accountName: true, accountNumber: true, bankName: true } },
  transferBankAccount: { select: { id: true, accountName: true, accountNumber: true, bankName: true } },
  payments: { orderBy: { createdAt: "asc" as const }, include: salesPaymentInclude },
};

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
    });

    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const where = { stationId, tenantId: actor.tenantId };

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.salesLog.count({ where }),
        prisma.salesLog.findMany({
          where,
          orderBy: { logDate: "desc" },
          take,
          skip,
          include: salesLogInclude,
        }),
      ]);
      return ok(rows.map(serializeSalesLog), buildOffsetPageMeta(totalCount, page, take));
    }

    const salesLogs = await prisma.salesLog.findMany({
      where,
      orderBy: { logDate: "desc" },
      include: salesLogInclude,
    });

    return ok(salesLogs.map(serializeSalesLog));
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
    const body = CreateSalesLogSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const payments = validatePaymentInputs(resolvePaymentInputs(body));
    const { amountPos, amountTransfer } = sumsFromPayments(payments);
    const banks = firstBankIds(payments);

    const appliedCredit = Number(body.appliedCredit || 0);
    if (appliedCredit > 0) {
      const available = await computeStationOverpayment(stationId, actor.tenantId);
      const expected = Number(body.litersSold) * Number(body.pricePerLiter);
      const maxCredit = Math.max(0, Math.min(available, expected));
      if (appliedCredit > maxCredit + 0.01) {
        throw new DomainError(
          400,
          "invalid_input",
          `Applied credit cannot exceed available overpayment (₦${maxCredit.toLocaleString("en-NG", { minimumFractionDigits: 2 })}).`,
        );
      }
    }

    const bankIds = [...new Set(payments.map((p) => p.bankAccountId))];
    await assertBankAccountsUsableForStation({
      accountIds: bankIds,
      tenantId: actor.tenantId,
      stationId,
    });

    const logDate = body.logDate ? new Date(body.logDate) : new Date();

    if (body.clientId) {
      const existingLog = await prisma.salesLog.findUnique({
        where: { id: body.clientId },
        include: salesLogInclude,
      });
      if (existingLog) {
        return ok({ salesLog: serializeSalesLog(existingLog) });
      }
    }

    const parentSaleId = body.parentSaleId || null;
    if (body.isDebtRepayment) {
      if (!parentSaleId) {
        throw new DomainError(400, "invalid_input", "A parent sale is required for debt repayments.");
      }
      const parentSale = await prisma.salesLog.findFirst({
        where: { id: parentSaleId, stationId, tenantId: actor.tenantId },
      });
      if (!parentSale) {
        throw new DomainError(400, "invalid_input", "Parent sales report not found.");
      }
    }

    let tankId: string | null = null;
    if (body.dippingClosingId) {
      const closing = await prisma.dippingClosing.findUnique({
        where: { id: body.dippingClosingId },
        include: { session: true },
      });
      if (closing) {
        tankId = closing.session.tankId;
      }
    }

    if (!tankId) {
      const tank = await prisma.tank.findFirst({
        where: { stationId, tenantId: actor.tenantId, productType: body.productType as never },
        orderBy: { currentLiters: "desc" },
      });
      if (tank) {
        tankId = tank.id;
      }
    }

    const salesLog = await prisma.$transaction(async (tx) => {
      const log = await tx.salesLog.create({
        data: {
          id: body.clientId || undefined,
          tenantId: actor.tenantId,
          stationId,
          productType: body.productType,
          litersSold: body.litersSold,
          pricePerLiter: body.pricePerLiter,
          amountPos,
          amountTransfer,
          appliedCredit,
          posBankAccountId: banks.posBankAccountId,
          transferBankAccountId: banks.transferBankAccountId,
          posReceiptUrl: banks.posReceiptUrl,
          transferReceiptUrl: banks.transferReceiptUrl,
          logDate,
          recordedById: actor.userId,
          dippingClosingId: body.dippingClosingId,
          isDebtRepayment: body.isDebtRepayment,
          parentdeliveryId: parentSaleId,
          payments: {
            create: payments.map((p) => ({
              id: p.id || p.clientId || undefined,
              tenantId: actor.tenantId,
              method: p.method,
              amount: p.amount,
              bankAccountId: p.bankAccountId,
              receiptUrl: p.receiptUrl ?? null,
              clientId: p.clientId ?? p.id ?? null,
              status: "PENDING",
            })),
          },
        },
        include: salesLogInclude,
      });

      if (tankId && body.litersSold > 0) {
        await StockMovementService.recordRetailSale(tx as never, {
          tenantId: actor.tenantId,
          stationId,
          tankId,
          productType: body.productType as never,
          quantity: body.litersSold,
          referenceId: log.id,
          notes: `Retail sale ${body.dippingClosingId ? "from dipping" : ""}`,
          recordedById: actor.userId,
        });
        await reconcileTankCurrentLiters(tx as never, tankId);
      }

      await FinanceService.recordRetailSaleRevenue(tx as never, {
        tenantId: actor.tenantId,
        stationId,
        salesLogId: log.id,
        payments,
      });

      return log;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales.record",
      tenantId: actor.tenantId,
      targetType: "SalesLog",
      targetId: salesLog.id,
      after: {
        productType: salesLog.productType,
        litersSold: salesLog.litersSold,
        amountPos: salesLog.amountPos,
        amountTransfer: salesLog.amountTransfer,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ salesLog: serializeSalesLog(salesLog) });
  } catch (e) {
    return handleError(e);
  }
}
