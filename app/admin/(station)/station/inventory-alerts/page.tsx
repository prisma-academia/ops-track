import { redirect } from "next/navigation";

export default function InventoryAlertsRedirectPage() {
  redirect("/admin/station/tickets?category=INVENTORY_VARIANCE");
}
