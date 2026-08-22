import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateTransactionSchema = z.object({
  type: z.enum(["INFLOW", "OUTFLOW"]),
  category: z.enum(["TRANSPORT_PAYMENT", "CLIENT_PAYMENT", "EXPENSE", "OTHER"]),
  amount: z.number().positive(),
  paymentPurpose: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  paymentMethod: z
    .enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"])
    .optional()
    .nullable(),
  deliveryId: z.string().optional().nullable(),
  bankAccountId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_READ.key,
      "FLEET",
    );
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
        delivery: {
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
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key,
      "FLEET",
    );
    const body = CreateTransactionSchema.parse(await request.json());
    const meta = requestMeta(request);

    if (
      body.paymentMethod &&
      body.paymentMethod !== "CASH" &&
      !body.bankAccountId
    ) {
      throw new DomainError(
        400,
        "invalid_input",
        "Bank account is required for non-cash payments.",
      );
    }

    const transaction = await prisma.transaction.create({
      data: {
        tenantId: actor.tenantId,
        type: body.type,
        category: body.category,
        amount: body.amount,
        paymentPurpose: body.paymentPurpose ?? null,
        reference: body.reference ?? null,
        paymentMethod: body.paymentMethod ?? null,
        deliveryId: body.deliveryId ?? null,
        bankAccountId: body.bankAccountId,
      },
    });

    // Auto-reconcile: if this is an INFLOW linked to a delivery, update the delivery status
    if (body.type === "INFLOW" && body.deliveryId) {
      const delivery = await prisma.delivery.findUnique({
        where: { id: body.deliveryId },
      });
      if (delivery) {
        const allTx = await prisma.transaction.findMany({
          where: { deliveryId: body.deliveryId, type: "INFLOW" },
        });
        const totalPaid = allTx.reduce((sum, tx) => sum + Number(tx.amount), 0);
        const totalExpected = Number(delivery.totalExpectedAmount);
        const newStatus = totalPaid >= totalExpected ? "CLEARED" : "PART_PAID";

        await prisma.delivery.update({
          where: { id: body.deliveryId },
          data: { paymentReceived: totalPaid, status: newStatus },
        });
      }
    }

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transaction.create",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: transaction.id,
      after: {
        type: transaction.type,
        amount: transaction.amount.toString(),
        category: transaction.category,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction });
  } catch (e) {
    return handleError(e);
  }
}
