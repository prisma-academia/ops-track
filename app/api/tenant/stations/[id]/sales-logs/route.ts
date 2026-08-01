import { requireCsrf } from "@/lib/api/csrf-guard";
import { DomainError, handleError } from "@/lib/api/errors";
import { buildOffsetPageMeta, parseOffsetPagination } from "@/lib/api/pagination";
import { ok } from "@/lib/api/respond";
import { audit, requestMeta } from "@/lib/auth/audit";
import { requireTenantActor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const CreateSalesLogSchema = z.object({
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersSold: z.coerce.number().min(0), // Changed from .positive() to allow 0 for debt repayments
  pricePerLiter: z.coerce.number().min(0).default(0),
  amountPos: z.coerce.number().min(0),
  amountTransfer: z.coerce.number().min(0).default(0),
  posBankAccountId: z.string().nullable().optional(),
  transferBankAccountId: z.string().nullable().optional(),
  posReceiptUrl: z.string().nullable().optional(),
  transferReceiptUrl: z.string().nullable().optional(),
  logDate: z.string().optional(),
  dippingClosingId: z.string().optional(),
  clientId: z.string().optional(),
  isDebtRepayment: z.boolean().optional().default(false),
  parentSaleId: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor();
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");

    const station = await prisma.station.findUnique({
      where: { id: stationId },
    });
    
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const where = { stationId, tenantId: actor.tenantId };
    const include = {
      recordedBy: { select: { firstName: true, lastName: true } },
      posBankAccount: { select: { id: true, accountName: true, accountNumber: true } },
      transferBankAccount: { select: { id: true, accountName: true, accountNumber: true } },
    };

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.salesLog.count({ where }),
        prisma.salesLog.findMany({
          where,
          orderBy: { logDate: "desc" },
          take,
          skip,
          include,
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    }

    const salesLogs = await prisma.salesLog.findMany({
      where,
      orderBy: { logDate: "desc" },
      include,
    });

    return ok(salesLogs);
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
    const actor = await requireTenantActor();
    const body = CreateSalesLogSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    if (body.amountPos <= 0 && body.amountTransfer <= 0) {
      throw new DomainError(400, "invalid_input", "At least one revenue amount must be greater than zero.");
    }



    if (body.amountPos > 0 && !body.posBankAccountId) {
      throw new DomainError(400, "invalid_input", "POS bank account is required for POS payments.");
    }

    if (body.amountTransfer > 0 && !body.transferBankAccountId) {
      throw new DomainError(400, "invalid_input", "Transfer bank account is required for bank transfer payments.");
    }

    const logDate = body.logDate ? new Date(body.logDate) : new Date();

    if (body.clientId) {
      const existingLog = await prisma.salesLog.findUnique({
        where: { id: body.clientId },
      });
      if (existingLog) {
        return ok(existingLog);
      }
    }

    const salesLog = await prisma.salesLog.create({
      data: {
        id: body.clientId || undefined,
        tenantId: actor.tenantId,
        stationId,
        productType: body.productType,
        litersSold: body.litersSold,
        pricePerLiter: body.pricePerLiter,
        amountPos: body.amountPos,
        amountTransfer: body.amountTransfer,
        posBankAccountId: body.posBankAccountId || null,
        transferBankAccountId: body.transferBankAccountId || null,
        posReceiptUrl: body.posReceiptUrl,
        transferReceiptUrl: body.transferReceiptUrl,
        logDate,
        recordedById: actor.userId,
        dippingClosingId: body.dippingClosingId,
        isDebtRepayment: body.isDebtRepayment,
        parentSaleId: body.parentSaleId || null,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales.record",
      tenantId: actor.tenantId,
      targetType: "SalesLog",
      targetId: salesLog.id,
      after: { productType: salesLog.productType, litersSold: salesLog.litersSold, amountPos: salesLog.amountPos, amountTransfer: salesLog.amountTransfer } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ salesLog });
  } catch (e) {
    return handleError(e);
  }
}
