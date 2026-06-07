import { redirectIfAuthenticated } from "@/lib/auth/page-guards";

/**
 * Wraps the public platform auth screens (login / register / forgot /
 * reset). A user with a valid FULL session is bounced to the dashboard so
 * logged-in users cannot reach these forms. `change-password` is
 * deliberately OUTSIDE this group — a MUST_CHANGE_PASSWORD session must
 * still reach it.
 */
export default async function PlatformAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfAuthenticated("platform");
  return <>{children}</>;
}
