import { redirect } from "next/navigation";

export default function DriversPage() {
  redirect("/admin/fleet/assets?tab=drivers");
}
