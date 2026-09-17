import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireTenantActor } from "@/lib/auth/guards";
import { verifyAccountNumber } from "@/lib/paystack";

export async function GET(request: Request) {
  try {
    await requireTenantActor();
    const url = new URL(request.url);
    const accountNumber = url.searchParams.get("account_number");
    const bankCode = url.searchParams.get("bank_code");

    if (!accountNumber || !bankCode) {
      throw new DomainError(400, "invalid_input", "account_number and bank_code are required");
    }

    const data = await verifyAccountNumber(accountNumber, bankCode);
    if (!data) {
      throw new DomainError(404, "not_found", "Could not verify account number");
    }

    return ok(data);
  } catch (e) {
    return handleError(e);
  }
}
