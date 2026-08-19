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
  title: string;
  module: ModuleKey | null;
  icon?: string;
  permission: string | null;
  children?: { href: string; key: string; title: string; module: ModuleKey | null; permission: string | null }[];
}

// `module: null` = always shown (Overview, Settings).
const NAV: NavItemConfig[] = [
  { href: "/admin/dashboard", key: "overview", title: "Overview", module: null, icon: "IconLayoutDashboard", permission: null },
  {
    key: "userManagement",
    title: "User Management",
    module: "users" as ModuleKey,
    icon: "IconUsersGroup",
    permission: null,
    children: [
      { href: "/admin/users", key: "users", title: "Users", module: "users" as ModuleKey, permission: PERMISSIONS.TENANT_USERS_READ.key },
      { href: "/admin/role-templates", key: "roles", title: "Role & Permissions", module: "roles" as ModuleKey, permission: PERMISSIONS.TENANT_ROLES_READ.key },
    ]
  },
  { href: "/admin/stations", key: "stations", title: "Stations", module: "stations" as ModuleKey, icon: "IconGasStation", permission: PERMISSIONS.TENANT_STATIONS_READ.key },
  { href: "/admin/waybills", key: "waybills", title: "Waybills", module: "operations" as ModuleKey, icon: "IconTruck", permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
  { href: "/admin/expenses", key: "expenses", title: "Expenses", module: "operations" as ModuleKey, icon: "IconReceiptDollar", permission: PERMISSIONS.TENANT_EXPENSES_READ.key },
  { href: "/admin/prices", key: "prices", title: "Prices", module: "operations" as ModuleKey, icon: "IconReportAnalytics", permission: PERMISSIONS.TENANT_PRICES_READ.key },
  { href: "/admin/tickets", key: "tickets", title: "Tickets", module: "operations" as ModuleKey, icon: "IconTicket", permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
  {
    key: "reports",
    title: "Reports",
    module: "operations" as ModuleKey,
    icon: "IconFileText",
    permission: null,
    children: [
      { href: "/admin/sales-reports", key: "salesReports", title: "Sales Reports", module: "operations" as ModuleKey, permission: PERMISSIONS.TENANT_SHIFTS_READ.key },
      { href: "/admin/stock-report", key: "stockReport", title: "Stock Report", module: "operations" as ModuleKey, permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
      { href: "/admin/pnl-report", key: "pnlReport", title: "PnL Report", module: "operations" as ModuleKey, permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
    ],
  },
  { href: "/admin/bank-accounts", key: "bankAccounts", title: "Bank Accounts", module: null, icon: "IconBuildingBank", permission: PERMISSIONS.TENANT_SETTINGS_READ.key },
  { href: "/admin/activity", key: "activity", title: "Activity Logs", module: "activity" as ModuleKey, icon: "IconActivity", permission: PERMISSIONS.TENANT_ACTIVITY_READ.key },
];

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireTenantPage(undefined, "STATION");

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
      where: { 
        tenantId: actor.tenantId,
        ...(actor.organizationId ? { organizationId: actor.organizationId } : {})
      },
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
  
  const allInternalOrgs = await prisma.organization.findMany({
    where: { tenantId: actor.tenantId, type: "INTERNAL" },
    select: { id: true, name: true, slug: true, logoKey: true }
  });

  let isAllowed = activeStationId === "all" || allowedStations.some((s) => s.id === activeStationId);
  if (!isAllowed) {
    // Handle if the ID belongs to an org
    if (allInternalOrgs.some(org => org.id === activeStationId)) {
      isAllowed = true;
    }
  }

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
    } else {
      // It might be an organization ID
      const org = allInternalOrgs.find(o => o.id === activeStationId);
      if (org) orgInfo = org;
    }
  }
  
  if (!orgInfo && actor.organizationId) {
    orgInfo = await prisma.organization.findUnique({
      where: { id: actor.organizationId },
      select: { name: true, slug: true, logoKey: true }
    });
  }

  if (!orgInfo) {
    const internalOrg = await prisma.organization.findFirst({
      where: { tenantId: actor.tenantId, type: "INTERNAL" },
      select: { name: true, slug: true, logoKey: true }
    });
    if (internalOrg) {
      orgInfo = internalOrg;
    } else {
      const firstOrg = allowedStations.find((s) => s.organization?.name)?.organization;
      if (firstOrg && firstOrg.name) {
        orgInfo = {
          name: firstOrg.name,
          slug: firstOrg.slug || null,
          logoKey: firstOrg.logoKey || null,
        };
      }
    }
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
  
  const internalOrganizations = allInternalOrgs.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug || null,
    logoUrl: org.logoKey?.startsWith("http")
      ? org.logoKey
      : (org.logoKey && s3Configured() ? publicUrlForKey(org.logoKey) : null)
  }));
  
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
      title: n.title,
      icon: n.icon,
      children: n.children
        ? n.children
            .filter((c) => (c.module === null || enabled.includes(c.module)) && (!c.permission || hasPermission(actor, c.permission as any)))
            .map((c) => ({
              href: c.href,
              title: c.title,
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
      internalOrganizations={internalOrganizations}
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

