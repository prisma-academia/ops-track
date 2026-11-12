import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { loadWaybillProfitReport } from "@/lib/station/waybill-profit";
import { notFound } from "next/navigation";
import { WaybillProfitDetails } from "./waybill-profit-details";

export default async function WaybillProfitDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STOCK_REPORTS_READ.key);
  const { id } = await params;
  const report = await loadWaybillProfitReport(actor.tenantId);
  const row = report.rows.find((entry) => entry.id === id);
  if (!row) notFound();

  return (
    <WaybillProfitDetails
      row={row}
      breakdown={report.breakdowns[id] ?? { sales: [], expenses: [] }}
    />
  );
}
