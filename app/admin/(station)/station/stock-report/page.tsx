import { redirect } from "next/navigation";

/** Stock progress now lives on the Waybill Profit Report. */
export default function StockReportPage() {
  redirect("/admin/station/delivery-pnl");
}
