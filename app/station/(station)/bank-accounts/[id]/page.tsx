import { notFound } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getBankAccountDetailsData } from "@/lib/bank-accounts/bank-account-details";
import { BankAccountDetailsView } from "@/components/bank-accounts/bank-account-details-view";

export default async function StationBankAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key);
  const { id } = await params;

  const details = await getBankAccountDetailsData({
    tenantId: actor.tenantId,
    bankAccountId: id,
  });

  if (!details || details.account.scope !== "STATION") {
    notFound();
  }

  return (
    <div>
      <BankAccountDetailsView
        initialDetails={details}
        backUrl="/admin/bank-accounts"
      />
    </div>
  );
}
