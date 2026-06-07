import { redirectIfAuthenticated } from "@/lib/auth/page-guards";

/**
 * Wraps the public tenant-admin auth screens (login / forgot / reset). A
 * logged-in tenant user with a valid FULL session is bounced to the admin
 * dashboard. `change-password` is OUTSIDE this group so a
 * MUST_CHANGE_PASSWORD session can still reach it.
 */
export default async function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated("admin");
  return <>{children}</>;
}
