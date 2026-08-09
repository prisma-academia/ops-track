import { redirect } from "next/navigation";

export default function TransportersPage() {
  redirect("/admin/fleet/assets?tab=transporters");
}
