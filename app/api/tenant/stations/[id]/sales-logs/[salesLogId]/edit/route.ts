import { requireCsrf } from "@/lib/api/csrf-guard";
import { DomainError, handleError } from "@/lib/api/errors";
import { ok } from "@/lib/api/respond";
import { audit, requestMeta } from "@/lib/auth/audit";
import { PERMISSIONS, requireTenantActor } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import {
  firstBankIds,
  resolvePaymentInputs,
  rollupSalesLogStatus,
  salesPaymentInclude,
  sumsFromPayments,
  validatePaymentInputs,
} from "@/lib/sales/payments";
import { assertBankAccountsUsableForStation } from "@/lib/bank-accounts/assert-usable";
import { z } from "zod";

const PaymentInputSchema = z.object({
  id: z.string().optional(),
  clientId: z.string().nullable().optional(),
  method: z.enum(["POS", "TRANSFER"]),
  amount: z.coerce.number().min(0),
  bankAccountId: z.string(),
  receiptUrl: z.string().nullable().optional(),
});

const EditSalesLogSchema = z.object({
  amountPos: z.coerce.number().min(0).optional(),
  amountTransfer: z.coerce.number().min(0).optional(),
  posBankAccountId: z.string().nullable().optional(),
  transferBankAccountId: z.string().nullable().optional(),
  posReceiptUrl: z.string().nullable().optional(),
  transferReceiptUrl: z.string().nullable().optional(),
  payments: z.array(PaymentInputSchema).optional(),
  appliedCredit: z.coerce.number().min(0).optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; salesLogId: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId, salesLogId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SHIFTS_WRITE.key, "STATION");
    const body = EditSalesLogSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const salesLog = await prisma.salesLog.findUnique({
      where: { id: salesLogId },
      include: { payments: true },
    });

    if (!salesLog || salesLog.tenantId !== actor.tenantId || salesLog.stationId !== stationId) {
      throw new DomainError(404, "not_found", "Sales log not found.");
    }

    if (salesLog.status === "APPROVED") {
      throw new DomainError(400, "already_approved", "Cannot edit an approved sales report.");
    }

    const incoming = validatePaymentInputs(resolvePaymentInputs(body));
    await assertBankAccountsUsableForStation({
      accountIds: incoming.map((p) => p.bankAccountId),
      tenantId: actor.tenantId,
      stationId,
    });
    const approvedPayments = salesLog.payments.filter((p) => p.status === "APPROVED");

    for (const approved of approvedPayments) {
      const match = incoming.find(
        (p) => p.id === approved.id || (p.clientId && p.clientId === approved.clientId),
      );
      if (!match) {
        throw new DomainError(400, "invalid_input", "Approved payment lines cannot be removed.");
      }
      if (Number(match.amount) !== Number(approved.amount) || match.method !== approved.method) {
        throw new DomainError(400, "invalid_input", "Approved payment amounts cannot be changed.");
      }
      if (match.bankAccountId !== approved.bankAccountId) {
        throw new DomainError(400, "invalid_input", "Approved payment bank accounts cannot be changed.");
      }
    }

    const { amountPos, amountTransfer } = sumsFromPayments(incoming);
    const banks = firstBankIds(incoming);

    const updated = await prisma.$transaction(async (tx) => {
      const keepIds = new Set<string>();

      for (const p of incoming) {
        const existing = salesLog.payments.find(
          (row) => row.id === p.id || (p.clientId && row.clientId === p.clientId),
        );

        if (existing?.status === "APPROVED") {
          keepIds.add(existing.id);
          if (p.method === "POS" && p.receiptUrl && !existing.receiptUrl) {
            await tx.salesPayment.update({
              where: { id: existing.id },
              data: { receiptUrl: p.receiptUrl },
            });
          }
          continue;
        }

        if (existing) {
          keepIds.add(existing.id);
          await tx.salesPayment.update({
            where: { id: existing.id },
            data: {
              method: p.method,
              amount: p.amount,
              bankAccountId: p.bankAccountId,
              receiptUrl: p.receiptUrl ?? null,
              status: "PENDING",
              reason: null,
            },
          });
          continue;
        }

        const created = await tx.salesPayment.create({
          data: {
            id: p.id || p.clientId || undefined,
            tenantId: actor.tenantId,
            salesLogId,
            method: p.method,
            amount: p.amount,
            bankAccountId: p.bankAccountId,
            receiptUrl: p.receiptUrl ?? null,
            clientId: p.clientId ?? p.id ?? null,
            status: "PENDING",
          },
        });
        keepIds.add(created.id);
      }

      const toDelete = salesLog.payments.filter(
        (p) => p.status !== "APPROVED" && !keepIds.has(p.id),
      );
      if (toDelete.length > 0) {
        await tx.salesPayment.deleteMany({
          where: { id: { in: toDelete.map((p) => p.id) } },
        });
      }

      const remaining = await tx.salesPayment.findMany({ where: { salesLogId } });

      return tx.salesLog.update({
        where: { id: salesLogId },
        data: {
          amountPos,
          amountTransfer,
          posBankAccountId: banks.posBankAccountId,
          transferBankAccountId: banks.transferBankAccountId,
          posReceiptUrl: banks.posReceiptUrl,
          transferReceiptUrl: banks.transferReceiptUrl,
          status: rollupSalesLogStatus(remaining),
          ...(body.appliedCredit !== undefined ? { appliedCredit: body.appliedCredit } : {}),
        },
        include: { payments: { include: salesPaymentInclude } },
      });
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "sales.edit",
      tenantId: actor.tenantId,
      targetType: "SalesLog",
      targetId: salesLogId,
      after: { amountPos: updated.amountPos, amountTransfer: updated.amountTransfer } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ salesLog: { ...updated, parentSaleId: updated.parentdeliveryId ?? null } });
  } catch (e) {
    return handleError(e);
  }
}
