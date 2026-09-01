import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { assertOptionalBankAccount } from "@/lib/bank-accounts/assert-usable";
import {
  getRemainingForLeg,
  hasFullTripPayment,
  hasPartialLegPayments,
} from "@/lib/fleet/transport-fees";

const TransportPaymentSchema = z.object({
  transportId: z.string(),
  transporterId: z.string().min(1),
  amount: z.number().positive(),
  feeLeg: z.enum([
    "ORIGIN_TO_DEPOT",
    "DEPOT_TO_PRIMARY",
    "PRIMARY_TO_SUBSEQUENT",
    "FULL_TRIP",
  ]),
  deliveryId: z.string().optional().nullable(),
  paymentMethod: z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE", "DEPOSIT"]),
  reference: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  bankAccountId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(
      PERMISSIONS.TENANT_FLEET_PAYMENTS_WRITE.key,
      "FLEET",
    );
    const body = TransportPaymentSchema.parse(await request.json());
    const meta = requestMeta(request);

    if (
      body.paymentMethod !== "CASH" &&
      body.paymentMethod !== "DEPOSIT" &&
      !body.bankAccountId
    ) {
      throw new DomainError(
        400,
        "invalid_input",
        "Bank account is required for this payment method.",
      );
    }
    await assertOptionalBankAccount({
      accountId: body.bankAccountId,
      tenantId: actor.tenantId,
      context: "FLEET",
    });

    const transaction = await prisma.$transaction(async (tx) => {
      const transport = await tx.transport.findUnique({
        where: { id: body.transportId, tenantId: actor.tenantId },
        include: {
          deliveries: {
            include: { station: true, customer: true },
          },
          transactions: {
            where: { category: "TRANSPORT_PAYMENT" },
          },
        },
      });

      if (!transport) {
        throw new DomainError(404, "not_found", "Transport not found.");
      }

      const tenant = await tx.tenant.findUnique({
        where: { id: actor.tenantId },
        select: { settingsJson: true },
      });
      const settings = parseTenantSettings(tenant?.settingsJson);
      const originToDepotFee = settings.originToDepotFee;

      if (
        body.feeLeg === "FULL_TRIP" &&
        hasPartialLegPayments(transport.transactions)
      ) {
        throw new DomainError(
          400,
          "invalid_input",
          "Cannot pay full trip when individual fee legs have already been paid.",
        );
      }

      if (
        body.feeLeg !== "FULL_TRIP" &&
        hasFullTripPayment(transport.transactions)
      ) {
        throw new DomainError(
          400,
          "invalid_input",
          "Cannot pay individual legs after a full trip payment has been recorded.",
        );
      }

      if (body.feeLeg === "PRIMARY_TO_SUBSEQUENT") {
        const deliveries = transport.deliveries;
        if (deliveries.length > 1 && !body.deliveryId) {
          throw new DomainError(
            400,
            "invalid_input",
            "Select a delivery for the secondary destination fee leg.",
          );
        }
        if (
          body.deliveryId &&
          !deliveries.some((d) => d.id === body.deliveryId)
        ) {
          throw new DomainError(
            400,
            "invalid_input",
            "Delivery does not belong to this transport.",
          );
        }
      }

      const remaining = getRemainingForLeg(
        transport,
        transport.transactions,
        body.feeLeg,
        {
          deliveryId: body.deliveryId ?? undefined,
          originToDepotFee,
        },
      );

      if (remaining <= 0) {
        throw new DomainError(
          400,
          "invalid_input",
          "This fee leg has already been fully paid.",
        );
      }

      if (body.amount > remaining) {
        throw new DomainError(
          400,
          "invalid_input",
          `Payment exceeds remaining balance of ${remaining.toLocaleString()} for this fee leg.`,
        );
      }

      const trx = await tx.transaction.create({
        data: {
          tenantId: actor.tenantId,
          type: "OUTFLOW",
          category: "TRANSPORT_PAYMENT",
          amount: body.amount,
          paymentMethod: body.paymentMethod,
          reference: body.reference,
          receiptUrl: body.receiptUrl,
          description: body.description,
          transportId: body.transportId,
          transporterId: body.transporterId,
          bankAccountId: body.bankAccountId,
          feeLeg: body.feeLeg,
          deliveryId:
            body.feeLeg === "PRIMARY_TO_SUBSEQUENT"
              ? (body.deliveryId ?? transport.deliveries[0]?.id ?? null)
              : null,
        },
      });

      await tx.transport.update({
        where: { id: body.transportId },
        data: {
          netTransportFeePaid:
            Number(transport.netTransportFeePaid) + body.amount,
        },
      });

      return trx;
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "payment.transport.create",
      tenantId: actor.tenantId,
      targetType: "Transaction",
      targetId: transaction.id,
      after: {
        amount: transaction.amount.toString(),
        feeLeg: body.feeLeg,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transaction });
  } catch (e) {
    return handleError(e);
  }
}
