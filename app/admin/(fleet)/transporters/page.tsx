import { redirect } from "next/navigation";

export default function TransportersPage() {
  redirect("/admin/assets?tab=transporters");
}
