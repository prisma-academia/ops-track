import { redirect } from "next/navigation";

export default function FleetAccountingSettingsRedirect() {
  redirect("/admin/settings?tab=fleet");
}
