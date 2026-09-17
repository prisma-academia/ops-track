import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { DashboardLayoutShell } from "@/components/dashboard-layout-shell";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { UnauthorizedToast } from "@/components/unauthorized-toast";
import { COMPANY_NAME, COMPANY_LOGO } from "@/lib/branding";

const NAV = [
  { href: "/dashboard",     title: "Overview",      icon: "PieChart",      permission: null },
  { href: "/tenants",      title: "Tenants",       icon: "Building2",    permission: PERMISSIONS.PLATFORM_TENANTS_READ.key },
  { href: "/demo-requests",title: "Demo Requests",  icon: "InboxIcon",    permission: PERMISSIONS.PLATFORM_TENANTS_READ.key },
  { href: "/subscriptions/new", title: "Record Payment", icon: "BadgeDollarSign", permission: PERMISSIONS.PLATFORM_TENANTS_WRITE.key },
  { href: "/users",        title: "Users",         icon: "CircleUserRound",permission: PERMISSIONS.PLATFORM_USERS_READ.key },
  { href: "/role-templates",title: "Roles",        icon: "Shield",       permission: PERMISSIONS.PLATFORM_ROLES_READ.key },
  { href: "/activity",    title: "Audit Logs",    icon: "Activity",     permission: PERMISSIONS.PLATFORM_ACTIVITY_READ.key },
  { href: "/settings",    title: "Settings",      icon: "Settings",     permission: null },
];

export default async function PlatformDashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requirePlatformPage();

  const user = await prisma.platformUser.findUnique({
    where: { id: actor.userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) redirect("/auth/login");

  const pendingDemos = await prisma.demoRequest.count({ where: { status: "PENDING" } });

  const label = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;

  const filteredNav = NAV.filter(n => !n.permission || hasPermission(actor, n.permission));

  return (
    <DashboardLayoutShell
      title={COMPANY_NAME}
      logoUrl={COMPANY_LOGO.icon}
      navItems={filteredNav}
      user={{ name: label, email: user.email }}
      roleLabel="Super Admin"
      logoutEndpoint="/api/auth/logout"
      logoutRedirect="/auth/login"
      logoutContext="platform"
    >
      <UnauthorizedToast />
      {children}
    </DashboardLayoutShell>
  );
}

