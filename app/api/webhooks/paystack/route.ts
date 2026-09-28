import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    const secret = env.PAYSTACK_SECRET_KEY || "";

    if (!secret || !signature) {
      return NextResponse.json({ message: "Missing secret or signature" }, { status: 400 });
    }

    // Verify Paystack HMAC SHA512 signature
    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const data = payload.data;

    if (event === "charge.success" && data.status === "success") {
      const metadata = data.metadata || {};
      const reference = String(data.reference);
      const amountInNaira = Number((data.amount / 100).toFixed(2));
      const purpose = metadata.purpose;
      const clientId = metadata.clientId;
      const tenantId = metadata.tenantId;

      if (!clientId || !tenantId) {
        // Not a client module transaction (or general charge)
        return NextResponse.json({ received: true, ignored: true });
      }

      // 1. Idempotency Check: Don't process the same Paystack reference twice
      const alreadyProcessed = await prisma.clientWalletLedger.findFirst({
        where: { reference, tenantId },
      });
      if (alreadyProcessed) {
        return NextResponse.json({ received: true, already_processed: true });
      }

      const client = await prisma.client.findUnique({
        where: { id: clientId },
      });
      if (!client || client.tenantId !== tenantId) {
        return NextResponse.json({ message: "Client not found" }, { status: 404 });
      }

      if (purpose === "CLIENT_DEPOSIT") {
        const balanceBefore = Number(client.depositBalance);
        const balanceAfter = Number((balanceBefore + amountInNaira).toFixed(2));

        await prisma.$transaction([
          prisma.client.update({
            where: { id: clientId },
            data: { depositBalance: balanceAfter },
          }),
          prisma.clientWalletLedger.create({
            data: {
              tenantId,
              clientId,
              type: "PAYSTACK_DEPOSIT",
              amount: amountInNaira,
              balanceBefore,
              balanceAfter,
              reference,
              description: `Paystack wallet top-up of ₦${amountInNaira.toLocaleString()}`,
            },
          }),
        ]);
      } else if (purpose === "INVOICE_PAYMENT") {
        const invoiceId = metadata.invoiceId;
        const balanceBefore = Number(client.outstandingDebt);
        const balanceAfter = Math.max(0, Number((balanceBefore - amountInNaira).toFixed(2)));

        await prisma.$transaction([
          prisma.client.update({
            where: { id: clientId },
            data: { outstandingDebt: balanceAfter },
          }),
          ...(invoiceId
            ? [
                prisma.clientInvoice.update({
                  where: { id: invoiceId },
                  data: {
                    status: "PAID",
                    paystackRef: reference,
                    paidAt: new Date(),
                  },
                }),
              ]
            : []),
          prisma.clientWalletLedger.create({
            data: {
              tenantId,
              clientId,
              type: "INVOICE_PAYMENT",
              amount: amountInNaira,
              balanceBefore,
              balanceAfter,
              reference,
              description: `Paystack settlement of invoice debt: ₦${amountInNaira.toLocaleString()}`,
            },
          }),
        ]);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json({ message: "Webhook handler failed" }, { status: 500 });
  }
}
