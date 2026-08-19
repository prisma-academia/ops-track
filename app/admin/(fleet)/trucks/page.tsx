import { redirect } from "next/navigation";

export default function TrucksPage() {
  redirect("/admin/assets?tab=trucks");
}
