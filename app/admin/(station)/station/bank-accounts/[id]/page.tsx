import { notFound, redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getBankAccountDetailsData } from "@/lib/bank-accounts/bank-account-details";
import { BankAccountDetailsView } from "@/components/bank-accounts/bank-account-details-view";

export default async function StationBankAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key, "STATION");
  if (!hasPermission(actor, PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key)) {
    redirect("/admin/station/unauthorized");
  }

  const { id } = await params;

  const details = await getBankAccountDetailsData({
    tenantId: actor.tenantId,
    bankAccountId: id,
    paginateTransactions: false,
  });

  if (!details) {
    notFound();
  }

  const canViewAccount = details.account.scope === "STATION";
  if (!canViewAccount) {
    redirect("/admin/station/unauthorized");
  }

  return (
    <BankAccountDetailsView
      initialDetails={details}
      backUrl="/admin/station/bank-accounts"
    />
  );
}
