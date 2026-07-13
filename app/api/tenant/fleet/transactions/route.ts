import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateTransactionSchema = z.object({
  type: z.enum(["INFLOW", "OUTFLOW"]),
  category: z.enum(["TRANSPORT_PAYMENT", "CLIENT_PAYMENT", "EXPENSE", "OTHER"]),
  amount: z.number().positive(),
  paymentPurpose: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  paymentMethod: z.string().optional().nullable(),
  saleId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const type = url.searchParams.get("type");

    const rows = await prisma.transaction.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(type ? { type: type as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        sale: {
          select: {
            id: true,
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = CreateTransactionSchema.parse(await request.json());
    const meta = requestMeta(request);

    const transaction = await prisma.transaction.create({
      data: {
        tenantId: actor.tenantId,
        type: body.type,
        category: body.category,
        amount: body.amount,
        paymentPurpose: body.paymentPurpose ?? null,
        reference: body.reference ?? null,
        paymentMethod: body.paymentMethod ?? null,
        saleId: body.saleId ?? null,
      },
    });

    // Auto-reconcile: if this is an INFLOW linked to a sale, update the sale status
    if (body.type === "INFLOW" && body.saleId) {
      const sale = await prisma.sale.findUnique({ where: { id: body.saleId } });
      if (sale) {
        const allTx = await prisma.transaction.findMany({
          where: { saleId: body.saleId, type: "INFLOW" },
        });
        const totalPaid = allTx.reduce((sum, tx) => sum + Number(tx.amount), 0);
        const totalExpected = Number(sale.totalExpectedAmount);
        const newStatus = totalPaid >= totalExpected ? "CLEARED" : "PART_PAID";

        await prisma.sale.update({
          where: { id: body.saleId },
          data: { paymentReceived: totalPaid, status: newStatus },
        });
      }
    }

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transaction.create",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: transaction.id,
      after: { type: transaction.type, amount: transaction.amount.toString(), category: transaction.category } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction });
  } catch (e) {
    return handleError(e);
  }
}
