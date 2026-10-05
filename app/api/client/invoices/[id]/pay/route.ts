import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireClientActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { initializeTransaction } from "@/lib/paystack";

const PayInvoiceSchema = z.object({
  callbackUrl: z.string().url().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireClientActor();
    const body = PayInvoiceSchema.parse(await request.json().catch(() => ({})));

    const invoice = await prisma.clientInvoice.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!invoice || invoice.clientId !== actor.clientId || invoice.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Invoice not found.");
    }

    if (invoice.status === "PAID") {
      throw new DomainError(400, "already_paid", "This invoice has already been settled.");
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const callbackUrl = body.callbackUrl || `${protocol}://${host}/c/invoices?status=verify`;

    const paystack = await initializeTransaction({
      email: invoice.client.email,
      amountInNaira: Number(invoice.totalAmount),
      callbackUrl,
      metadata: {
        purpose: "INVOICE_PAYMENT",
        clientId: invoice.clientId,
        tenantId: actor.tenantId,
        invoiceId: invoice.id,
      },
    });

    return ok({
      authorization_url: paystack.authorization_url,
      reference: paystack.reference,
      access_code: paystack.access_code,
    });
  } catch (e) {
    return handleError(e);
  }
}
