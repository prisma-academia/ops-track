import { redirectIfAuthenticated } from "@/lib/auth/page-guards";

/**
 * Wraps the public client auth screens (login / register / forgot /
 * reset). A logged-in client with a valid FULL session is bounced to the
 * client dashboard. `change-password` is OUTSIDE this group so a
 * MUST_CHANGE_PASSWORD session can still reach it.
 */
export default async function ClientAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated("client");
  return <>{children}</>;
}
