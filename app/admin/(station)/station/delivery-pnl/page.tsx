import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { loadWaybillProfitReport } from "@/lib/station/waybill-profit";
import { DeliveryPnlManager } from "./delivery-pnl-manager";

export default async function DeliveryPnlPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STOCK_REPORTS_READ.key);
  const report = await loadWaybillProfitReport(actor.tenantId);
  return <DeliveryPnlManager initialRows={report.rows} stations={report.stations} />;
}
