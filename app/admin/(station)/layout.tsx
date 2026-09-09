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
import {
  ORGANIZATION_BRAND_SELECT,
  printCompanyFromOrganization,
  type OrganizationBrand,
} from "@/lib/print/org-branding";

interface NavItemConfig {
  href?: string;
  key: string;
  title: string;
  module: ModuleKey | null;
  icon?: string;
  permission: string | null;
  children?: { href: string; key: string; title: string; module: ModuleKey | null; permission: string | null; icon?: string }[];
}

// `module: null` = always shown (Overview, Settings).
const NAV: NavItemConfig[] = [
  { href: "/admin/station", key: "overview", title: "Overview", module: null, icon: "IconLayoutDashboard", permission: null },
  // {
  //   key: "analytics",
  //   title: "Analytics",
  //   module: null,
  //   icon: "IconFileText",
  //   permission: null,
  //   children: [
  //     { href: "/admin/station/commercial", key: "commercial", title: "Commercial", module: null, icon: "IconReportAnalytics", permission: null },
  //     { href: "/admin/station/inventory", key: "inventory", title: "Inventory", module: null, icon: "IconTruck", permission: null },
  //     { href: "/admin/station/operations", key: "operations", title: "Operations", module: null, icon: "IconTruck", permission: null },
  //   ],
  // },
  { href: "/admin/station/stations", key: "stations", title: "Stations", module: "stations" as ModuleKey, icon: "IconGasStation", permission: PERMISSIONS.TENANT_STATIONS_READ.key },
  { href: "/admin/station/waybills", key: "waybills", title: "Waybills", module: "operations" as ModuleKey, icon: "IconTruck", permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
  { href: "/admin/station/expenses", key: "expenses", title: "Expenses", module: "operations" as ModuleKey, icon: "IconReceiptDollar", permission: PERMISSIONS.TENANT_EXPENSES_READ.key },
  { href: "/admin/station/prices", key: "prices", title: "Prices", module: "operations" as ModuleKey, icon: "IconReportAnalytics", permission: PERMISSIONS.TENANT_PRICES_READ.key },
  {
    key: "reports",
    title: "Reports",
    module: "operations" as ModuleKey,
    icon: "IconFileText",
    permission: null,
    children: [
      { href: "/admin/station/sales-reports", key: "salesReports", title: "Sales Reports", module: "operations" as ModuleKey, icon: "IconReportAnalytics", permission: PERMISSIONS.TENANT_SALES_REPORTS_READ.key },
      { href: "/admin/station/delivery-pnl", key: "deliveryPnl", title: "Delivery Reports", module: "operations" as ModuleKey, icon: "IconTruck", permission: PERMISSIONS.TENANT_STOCK_REPORTS_READ.key },
      { href: "/admin/station/stock-report", key: "stockReport", title: "Stock Reports", module: "operations" as ModuleKey, icon: "IconFileText", permission: PERMISSIONS.TENANT_STOCK_REPORTS_READ.key },
    ],
  },
  {
    key: "monitoring",
    title: "Monitoring",
    module: "operations" as ModuleKey,
    icon: "IconActivity",
    permission: null,
    children: [
      { href: "/admin/station/dippings", key: "dippings", title: "Dippings", module: "operations" as ModuleKey, icon: "IconActivity", permission: PERMISSIONS.TENANT_DIPPINGS_READ.key },
      { href: "/admin/station/stock-movements", key: "stockMovements", title: "Stock Movements", module: "operations" as ModuleKey, icon: "IconTable", permission: PERMISSIONS.TENANT_STATIONS_READ.key },
      { href: "/admin/station/activity", key: "activity", title: "Activity", module: "operations" as ModuleKey, icon: "IconActivity", permission: PERMISSIONS.TENANT_STATIONS_READ.key },
    ],
  },
  { href: "/admin/station/bank-accounts", key: "bankAccounts", title: "Bank Accounts", module: "operations" as ModuleKey, icon: "IconBuildingBank", permission: PERMISSIONS.TENANT_BANK_ACCOUNTS_READ.key },
  {
    key: "alertsAndNotifications",
    title: "Alert & Notification",
    module: "operations" as ModuleKey,
    icon: "IconBell",
    permission: null,
    children: [
      { href: "/admin/station/notifications", key: "notifications", title: "Notifications", module: "operations" as ModuleKey, icon: "IconBell", permission: PERMISSIONS.TENANT_NOTIFICATIONS_READ.key },
      { href: "/admin/station/tickets", key: "tickets", title: "Tickets", module: "operations" as ModuleKey, icon: "IconTicket", permission: PERMISSIONS.TENANT_WAYBILLS_READ.key },
      // TENANT_TICKETS_READ is preferred; owners always see this. Existing roles keep waybills access via page fallback.
    ],
  },
  {
    key: "management",
    title: "Management",
    module: null,
    icon: "IconUsersGroup",
    permission: null,
    children: [
      { href: "/admin/station/users", key: "users", title: "Users", module: "users" as ModuleKey, icon: "IconUsers", permission: PERMISSIONS.TENANT_STATION_USERS_READ.key },
      { href: "/admin/station/role-templates", key: "roles", title: "Roles & Permissions", module: "roles" as ModuleKey, icon: "IconShield", permission: PERMISSIONS.TENANT_STATION_ROLES_READ.key },
      { href: "/admin/station/clients", key: "clients", title: "Clients", module: "operations" as ModuleKey, icon: "IconUsers", permission: PERMISSIONS.TENANT_CLIENTS_READ.key },
    ],
  },
  // { href: "/admin/station/table-demo", key: "tableDemo", title: "Table Demo", module: null, icon: "IconTable", permission: null },
];

export default async function StationDashboardLayout({ children }: { children: React.ReactNode }) {
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
          organization: { select: { ...ORGANIZATION_BRAND_SELECT, type: true } }
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
        organization: { select: { ...ORGANIZATION_BRAND_SELECT, type: true } }
      },
      orderBy: { name: "asc" },
    });
  }

  const jar = await cookies();
  let activeStationId = jar.get("active-station-id")?.value || "all";
  
  const allInternalOrgs = await prisma.organization.findMany({
    where: { tenantId: actor.tenantId, type: "INTERNAL" },
    select: { id: true, ...ORGANIZATION_BRAND_SELECT }
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

  let orgInfo: OrganizationBrand | null = null;
  if (activeStationId !== "all") {
    const activeStation = await prisma.station.findUnique({
      where: { id: activeStationId },
      select: { organization: { select: ORGANIZATION_BRAND_SELECT } }
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
      select: ORGANIZATION_BRAND_SELECT
    });
  }

  if (!orgInfo) {
    const internalOrg = await prisma.organization.findFirst({
      where: { tenantId: actor.tenantId, type: "INTERNAL" },
      select: ORGANIZATION_BRAND_SELECT
    });
    if (internalOrg) {
      orgInfo = internalOrg;
    } else {
      const firstOrg = allowedStations.find((s) => s.organization?.name)?.organization;
      if (firstOrg) orgInfo = firstOrg;
    }
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: {
      name: true,
      slug: true,
      status: true,
      settingsJson: true,
      activeModules: true,
      companyEmail: true,
      companyPhone: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      region: true,
    },
  });
  if (!tenant || tenant.status !== "ACTIVE") redirect("/maintenance");

  // Check if Station is enabled
  if (!tenant.activeModules.includes("STATION")) {
    if (tenant.activeModules.includes("FLEET")) {
      redirect("/admin");
    } else {
      redirect("/admin/auth/login?error=no_access");
    }
  }

  const tNav = await getTranslations("nav");
  const settings = parseTenantSettings(tenant?.settingsJson);
  const enabled = Array.from(new Set([
    ...settings.enabledModules,
    ...(tenant?.activeModules?.map(m => m.toLowerCase() as ModuleKey) || [])
  ]));
  
  let finalTitle = tenant?.name ?? "Tenant";
  const tenantLogoUrl = settings.logoKey?.startsWith("http")
    ? settings.logoKey
    : settings.logoKey && s3Configured()
    ? publicUrlForKey(settings.logoKey)
    : null;
  let finalLogoUrl = tenantLogoUrl;

  if (orgInfo) {
    finalTitle = orgInfo.name;
    finalLogoUrl = orgInfo.logoKey?.startsWith("http")
      ? orgInfo.logoKey
      : orgInfo.logoKey && s3Configured()
      ? publicUrlForKey(orgInfo.logoKey)
      : tenantLogoUrl;
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
              icon: c.icon,
            }))
        : undefined,
    };
  };

  const nav = NAV.filter(
    (n) => (n.module === null || enabled.includes(n.module)) && (!n.permission || hasPermission(actor, n.permission as any))
  ).map(mapNavItem).filter((n) => !n.children || n.children.length > 0);

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
        logoUrl: tenantLogoUrl,
        email: tenant.companyEmail,
        phone: tenant.companyPhone,
        address:
          [tenant.addressLine1, tenant.addressLine2, tenant.city, tenant.region]
            .filter(Boolean)
            .join(", ") || null,
      }}
      printCompany={orgInfo ? printCompanyFromOrganization(orgInfo) : undefined}
      profileHref="/admin/station/profile"
    >
      <UnauthorizedToast />
      {children}
    </DashboardLayoutShell>
  );
}

