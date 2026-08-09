import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { parseTenantSettings, type ModuleKey } from "@/lib/tenant/settings";
import { DashboardLayoutShell } from "@/components/dashboard-layout-shell";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
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
  // {
  //   key: "analytics",
  //   module: null,
  //   icon: "TrendingUp",
  //   permission: null,
  //   children: [
  //     { href: "/admin/dashboard/commercial", key: "commercial", module: null, permission: null },
  //     { href: "/admin/dashboard/inventory", key: "inventory", module: null, permission: null },
  //     { href: "/admin/dashboard/operations", key: "operations", module: null, permission: null },
  //   ],
  // },
  { href: "/admin/users", key: "users", module: "users" as ModuleKey, icon: "CircleUserRound", permission: PERMISSIONS.TENANT_USERS_READ.key },
  { href: "/admin/stations", key: "stations", module: "stations" as ModuleKey, icon: "MapPin", permission: PERMISSIONS.TENANT_STATIONS_READ.key },
  { href: "/admin/waybills", key: "waybills", module: "operations" as ModuleKey, icon: "Truck", permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
  { href: "/admin/expenses", key: "expenses", module: "operations" as ModuleKey, icon: "Coins", permission: PERMISSIONS.TENANT_EXPENSES_READ.key },
  { href: "/admin/prices", key: "prices", module: "operations" as ModuleKey, icon: "ChartNoAxesCombined", permission: PERMISSIONS.TENANT_PRICES_READ.key },
  { href: "/admin/tickets", key: "tickets", module: "operations" as ModuleKey, icon: "Ticket", permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
  {
    key: "reports",
    module: "operations" as ModuleKey,
    icon: "FileText",
    permission: null,
    children: [
      { href: "/admin/sales-reports", key: "salesReports", module: "operations" as ModuleKey, permission: PERMISSIONS.TENANT_SHIFTS_READ.key },
      { href: "/admin/stock-report", key: "stockReport", module: "operations" as ModuleKey, permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
      { href: "/admin/pnl-report", key: "pnlReport", module: "operations" as ModuleKey, permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
    ],
  },
  { href: "/admin/bank-accounts", key: "bankAccounts", module: null, icon: "CreditCard", permission: PERMISSIONS.TENANT_SETTINGS_READ.key },
  { href: "/admin/role-templates", key: "roles", module: "roles" as ModuleKey, icon: "Shield", permission: PERMISSIONS.TENANT_ROLES_READ.key },
  { href: "/admin/activity", key: "activity", module: "activity" as ModuleKey, icon: "Activity", permission: PERMISSIONS.TENANT_ACTIVITY_READ.key },
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
          organization: { select: { name: true, slug: true, logoKey: true, type: true } }
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
      select: { 
        id: true, 
        name: true, 
        code: true, 
        organization: { select: { name: true, slug: true, logoKey: true, type: true } }
      },
      orderBy: { name: "asc" },
    });
  }

  const jar = await cookies();
  let activeStationId = jar.get("active-station-id")?.value || "all";
  const isAllowed = activeStationId === "all" || allowedStations.some((s) => s.id === activeStationId);
  if (!isAllowed) {
    activeStationId = hasAssignedStations ? (allowedStations[0]?.id || "all") : "all";
  }

  let orgInfo = null;
  if (activeStationId !== "all") {
    const activeStation = await prisma.station.findUnique({
      where: { id: activeStationId },
      select: { organization: { select: { name: true, slug: true, logoKey: true } } }
    });
    if (activeStation?.organization) {
      orgInfo = activeStation.organization;
    }
  }
  
  if (!orgInfo && actor.organizationId) {
    orgInfo = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { name: true, slug: true, logoKey: true }
    });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { name: true, slug: true, status: true, settingsJson: true, activeModules: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") redirect("/maintenance");

  // Check if Station is enabled
  if (!tenant.activeModules.includes("STATION")) {
    if (tenant.activeModules.includes("FLEET")) {
      redirect("/admin/fleet");
    } else {
      redirect("/admin/modules");
    }
  }

  const tNav = await getTranslations("nav");
  const settings = parseTenantSettings(tenant?.settingsJson);
  const enabled = Array.from(new Set([
    ...settings.enabledModules,
    ...(tenant?.activeModules?.map(m => m.toLowerCase() as ModuleKey) || [])
  ]));
  
  let finalTitle = tenant?.name ?? "Tenant";
  let finalLogoUrl = settings.logoKey?.startsWith("http")
    ? settings.logoKey
    : settings.logoKey && s3Configured()
    ? publicUrlForKey(settings.logoKey)
    : null;

  if (orgInfo) {
    finalTitle = orgInfo.name;
    finalLogoUrl = orgInfo.logoKey?.startsWith("http")
      ? orgInfo.logoKey
      : orgInfo.logoKey && s3Configured()
      ? publicUrlForKey(orgInfo.logoKey)
      : null;
  }
  
  const mappedStations = allowedStations.map(s => {
    let sLogoUrl = null;
    if (s.organization?.logoKey) {
      sLogoUrl = s.organization.logoKey.startsWith("http") 
        ? s.organization.logoKey 
        : (s3Configured() ? publicUrlForKey(s.organization.logoKey) : null);
    }
    return {
      id: s.id,
      name: s.name,
      code: s.code,
      organization: {
        name: s.organization?.name || null,
        slug: s.organization?.slug || null,
        logoUrl: sLogoUrl,
        type: s.organization?.type || null
      }
    };
  });
  
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
      title={finalTitle}
      logoUrl={finalLogoUrl}
      navItems={nav}
      user={{ name: label, email: userWithStations.email }}
      roleLabel="Tenant Admin"
      logoutEndpoint="/api/auth/logout"
      logoutRedirect="/"
      logoutContext="tenant-admin"
      stations={mappedStations}
      activeStationId={activeStationId}
      enabledModules={enabled}
      tenant={{
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: finalLogoUrl,
      }}
    >
      <UnauthorizedToast />
      {children}
    </DashboardLayoutShell>
  );
}

