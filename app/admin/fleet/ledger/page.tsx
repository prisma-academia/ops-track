import { redirect } from "next/navigation";

export default function LedgerPage() {
  redirect("/admin/fleet/ledger/deliveries");
}
