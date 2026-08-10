import { redirect } from "next/navigation";

export default function TrucksPage() {
  redirect("/admin/fleet/assets?tab=trucks");
}
