import { requireExistingTenant } from "@/lib/auth/tenant-page";

/**
 * Client-area layout. Centralizes host→tenant resolution and enforces the
 * tenant lifecycle: a nonexistent tenant 404s, a suspended/archived tenant
 * shows the maintenance screen for all client routes (PRD §13). Session
 * redirects are enforced per-page via `requireClientPage()`.
 */
export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireExistingTenant();
  return <>{children}</>;
}
