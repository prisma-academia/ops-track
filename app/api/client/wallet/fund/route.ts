import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireClientActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { initializeTransaction } from "@/lib/paystack";

const FundSchema = z.object({
  amount: z.number().positive().min(100), // Min ₦100
  callbackUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireClientActor();
    const body = FundSchema.parse(await request.json());

    const client = await prisma.client.findUnique({
      where: { id: actor.clientId },
    });
    if (!client) {
      throw new DomainError(404, "not_found", "Client profile not found.");
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const callbackUrl = body.callbackUrl || `${protocol}://${host}/c/billing?status=verify`;

    const paystack = await initializeTransaction({
      email: client.email,
      amountInNaira: body.amount,
      callbackUrl,
      metadata: {
        purpose: "CLIENT_DEPOSIT",
        clientId: client.id,
        tenantId: actor.tenantId,
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
