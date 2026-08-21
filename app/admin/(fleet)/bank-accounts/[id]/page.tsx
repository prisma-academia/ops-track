import { notFound, redirect } from "next/navigation";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { getBankAccountDetailsData } from "@/lib/bank-accounts/bank-account-details";
import { BankAccountDetailsView } from "@/components/bank-accounts/bank-account-details-view";

export default async function FleetBankAccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(undefined, "FLEET");
  const canReadFleet = hasPermission(actor, PERMISSIONS.TENANT_FLEET_BANK_ACCOUNTS_READ.key);
  const canReadStation = hasPermission(actor, PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key);
  if (!canReadFleet && !canReadStation) {
    redirect("/admin/unauthorized");
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

  const canViewAccount =
    details.account.scope === "FLEET" ? canReadFleet : canReadStation || canReadFleet;
  if (!canViewAccount) {
    redirect("/admin/unauthorized");
  }

  return (
    <BankAccountDetailsView
      initialDetails={details}
      backUrl="/admin/bank-accounts"
    />
  );
}
