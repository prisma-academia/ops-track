import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { parseTenantSettings, type ModuleKey } from "@/lib/tenant/settings";
import { DashboardLayoutShell } from "@/components/dashboard-layout-shell";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { UnauthorizedToast } from "@/components/unauthorized-toast";

interface NavItemConfig {
  href?: string;
  key: string;
  module: ModuleKey | null;
  icon?: string;
  permission: string | null;
  children?: { href: string; key: string; module: ModuleKey | null; permission: string | null }[];
}

// `module: null` = always shown (Overview, Settings).
const NAV: NavItemConfig[] = [
  { href: "/admin/dashboard", key: "overview", module: null, icon: "PieChart", permission: null },
  {
    key: "analytics",
    module: null,
    icon: "TrendingUp",
    permission: null,
    children: [
      { href: "/admin/dashboard/commercial", key: "commercial", module: null, permission: null },
      { href: "/admin/dashboard/inventory", key: "inventory", module: null, permission: null },
      { href: "/admin/dashboard/operations", key: "operations", module: null, permission: null },
    ],
  },
  { href: "/admin/users", key: "users", module: "users" as ModuleKey, icon: "CircleUserRound", permission: PERMISSIONS.TENANT_USERS_READ.key },
  { href: "/admin/stations", key: "stations", module: "stations" as ModuleKey, icon: "MapPin", permission: PERMISSIONS.TENANT_STATIONS_READ.key },
  { href: "/admin/expenses", key: "expenses", module: "operations" as ModuleKey, icon: "Coins", permission: PERMISSIONS.TENANT_OPERATIONS_READ.key },
  { href: "/admin/waybills", key: "waybills", module: "operations" as ModuleKey, icon: "Truck", permission: PERMISSIONS.TENANT_OPERATIONS_READ.key },
  { href: "/admin/prices", key: "prices", module: "operations" as ModuleKey, icon: "ChartNoAxesCombined", permission: PERMISSIONS.TENANT_OPERATIONS_READ.key },
  { href: "/admin/sales-reports", key: "salesReports", module: "operations" as ModuleKey, icon: "FileText", permission: PERMISSIONS.TENANT_OPERATIONS_READ.key },
  { href: "/admin/role-templates", key: "roles", module: "roles" as ModuleKey, icon: "Shield", permission: PERMISSIONS.TENANT_ROLES_READ.key },
  { href: "/admin/activity", key: "activity", module: "activity" as ModuleKey, icon: "Activity", permission: PERMISSIONS.TENANT_ACTIVITY_READ.key },
  { href: "/admin/settings", key: "settings", module: null, icon: "Settings", permission: null },
  // { href: "/admin/dippings", key: "dippings", module: "operations" as ModuleKey, icon: "ClipboardList", permission: PERMISSIONS.TENANT_OPERATIONS_READ.key },
  // { href: "/admin/shifts", key: "shifts", module: "operations" as ModuleKey, icon: "Activity", permission: PERMISSIONS.TENANT_OPERATIONS_READ.key },
  // { href: "/admin/tickets", key: "tickets", module: "operations" as ModuleKey, icon: "AlertCircle", permission: PERMISSIONS.TENANT_TICKETS_READ.key },
  { href: "/admin/customers", key: "customers", module: "customers" as ModuleKey, icon: "Users", permission: PERMISSIONS.TENANT_CUSTOMERS_READ.key },

];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireTenantPage();

  const userWithStations = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: {
      email: true,
      firstName: true,
      lastName: true,
      stations: {
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!userWithStations) redirect("/admin/auth/login");

  let allowedStations = userWithStations.stations || [];
  const hasAssignedStations = allowedStations.length > 0;

  if (!hasAssignedStations) {
    allowedStations = await prisma.station.findMany({
      where: { tenantId: actor.tenantId },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  const jar = await cookies();
  let activeStationId = jar.get("active-station-id")?.value || "all";
  const isAllowed = activeStationId === "all" || allowedStations.some((s) => s.id === activeStationId);
  if (!isAllowed) {
    activeStationId = hasAssignedStations ? (allowedStations[0]?.id || "all") : "all";
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { name: true, status: true, settingsJson: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") redirect("/maintenance");

  const tNav = await getTranslations("nav");
  const enabled = parseTenantSettings(tenant?.settingsJson).enabledModules;
  
  const mapNavItem = (n: NavItemConfig): any => {
    return {
      href: n.href,
      title: tNav(n.key),
      icon: n.icon,
      children: n.children
        ? n.children
            .filter((c) => (c.module === null || enabled.includes(c.module)) && (!c.permission || hasPermission(actor, c.permission as any)))
            .map((c) => ({
              href: c.href,
              title: tNav(c.key),
            }))
        : undefined,
    };
  };

  const nav = NAV.filter(
    (n) => (n.module === null || enabled.includes(n.module)) && (!n.permission || hasPermission(actor, n.permission as any))
  ).map(mapNavItem);

  const label = `${userWithStations.firstName ?? ""} ${userWithStations.lastName ?? ""}`.trim() || userWithStations.email;
  return (
    <DashboardLayoutShell
      title={tenant?.name ?? "Tenant"}
      navItems={nav}
      user={{ name: label, email: userWithStations.email }}
      roleLabel="Tenant Admin"
      logoutEndpoint="/api/auth/logout"
      logoutRedirect="/admin/auth/login"
      logoutContext="tenant-admin"
      stations={allowedStations}
      activeStationId={activeStationId}
    >
      <UnauthorizedToast />
      {children}
    </DashboardLayoutShell>
  );
}

