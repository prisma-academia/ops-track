import { redirect } from "next/navigation";

export default function StationUnauthorizedPage() {
  redirect("/admin/station/profile?error=unauthorized");
}

