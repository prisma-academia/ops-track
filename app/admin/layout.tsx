import { requireExistingTenant } from "@/lib/auth/tenant-page";

/**
 * Wraps the entire tenant-admin segment (`admin/auth/*`, `admin/(station)/*`,
 * and `admin/(fleet)/*`). Enforces that the host resolves to a real,
 * existing tenant before any admin route renders — a nonexistent tenant
 * subdomain 404s here instead of rendering a login form. Session/permission
 * checks happen in each module's route-group layout.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireExistingTenant();
  return <>{children}</>;
}
