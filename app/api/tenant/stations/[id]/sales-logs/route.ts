import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateSalesLogSchema = z.object({
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersSold: z.coerce.number().positive(),
  amountCash: z.coerce.number().min(0),
  amountPos: z.coerce.number().min(0),
  amountTransfer: z.coerce.number().min(0).default(0),
  cashReceiptUrl: z.string().nullable().optional(),
  posReceiptUrl: z.string().nullable().optional(),
  logDate: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor();

    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: { staff: true },
    });
    
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const salesLogs = await prisma.dailySalesLog.findMany({
      where: { stationId, tenantId: actor.tenantId },
      orderBy: { logDate: "desc" },
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

    if (body.amountCash <= 0 && body.amountPos <= 0 && body.amountTransfer <= 0) {
      throw new DomainError(400, "invalid_input", "At least one revenue amount must be greater than zero.");
    }

    const logDate = body.logDate ? new Date(body.logDate) : new Date();

    const salesLog = await prisma.dailySalesLog.create({
      data: {
        tenantId: actor.tenantId,
        stationId,
        productType: body.productType,
        litersSold: body.litersSold,
        amountCash: body.amountCash,
        amountPos: body.amountPos,
        amountTransfer: body.amountTransfer,
        cashReceiptUrl: body.cashReceiptUrl,
        posReceiptUrl: body.posReceiptUrl,
        logDate,
        recordedById: actor.userId,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales.record",
      tenantId: actor.tenantId,
      targetType: "DailySalesLog",
      targetId: salesLog.id,
      after: { productType: salesLog.productType, litersSold: salesLog.litersSold, amountCash: salesLog.amountCash, amountPos: salesLog.amountPos } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ salesLog });
  } catch (e) {
    return handleError(e);
  }
}
