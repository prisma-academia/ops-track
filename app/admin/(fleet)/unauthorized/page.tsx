import { redirect } from "next/navigation";

export default function FleetUnauthorizedPage() {
  redirect("/admin/profile?error=unauthorized");
}

