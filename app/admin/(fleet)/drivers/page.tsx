import { redirect } from "next/navigation";

export default function DriversPage() {
  redirect("/admin/assets?tab=drivers");
}
