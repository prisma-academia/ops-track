import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { DashboardLayoutShell } from "@/components/dashboard-layout-shell";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import { UnauthorizedToast } from "@/components/unauthorized-toast";

const FLEET_NAV = [
  {
    href: "/admin",
    key: "overview",
    title: "Overview",
    icon: "IconLayoutDashboard",
    permission: PERMISSIONS.TENANT_FLEET_READ.key,
  },
  {
    href: "/admin/orders",
    key: "orders",
    title: "Orders",
    icon: "IconShoppingCart",
    permission: PERMISSIONS.TENANT_FLEET_ORDERS_READ.key,
  },
  {
    href: "/admin/transports",
    key: "transports",
    title: "Transports",
    icon: "IconMapPin",
    permission: PERMISSIONS.TENANT_FLEET_TRANSPORTS_READ.key,
  },
  {
    href: "/admin/deliveries",
    key: "deliveries",
    title: "Sales Deliveries",
    icon: "IconReceiptDollar",
    permission: PERMISSIONS.TENANT_FLEET_SALES_READ.key,
  },
  {
    href: "/admin/payments",
    key: "payments",
    title: "Payments",
    icon: "IconCreditCard",
    permission: PERMISSIONS.TENANT_FLEET_PAYMENTS_READ.key,
  },
  {
    key: "reportsAndAnalytics",
    title: "Reports",
    icon: "IconReportAnalytics",
    permission: PERMISSIONS.TENANT_FLEET_REPORTS_READ.key,
    children: [
      {
        href: "/admin/fleet-pnl-report",
        key: "fleetPnlReport",
        title: "Profit & Loss",
        icon: "IconFileText",
        permission: PERMISSIONS.TENANT_FLEET_REPORTS_READ.key,
      },
      {
        href: "/admin/station-performance",
        key: "stationPerformance",
        title: "Station Performance",
        icon: "IconBuildingStore",
        permission: PERMISSIONS.TENANT_FLEET_REPORTS_READ.key,
      },
      {
        href: "/admin/reports/transport",
        key: "transportReport",
        title: "Transport Report",
        icon: "IconTruck",
        permission: PERMISSIONS.TENANT_FLEET_REPORTS_READ.key,
      },
    ],
  },
  {
    key: "transactions",
    title: "Ledgers",
    icon: "IconWallet",
    permission: PERMISSIONS.TENANT_FLEET_LEDGER_READ.key,
    children: [
      {
        href: "/admin/ledger/deliveries",
        key: "deliveriesLedger",
        title: "Deliveries Ledger",
        icon: "IconReceiptDollar",
        permission: PERMISSIONS.TENANT_FLEET_LEDGER_READ.key,
      },
      {
        href: "/admin/ledger/transports",
        key: "transportsLedger",
        title: "Transport Ledger",
        icon: "IconTruck",
        permission: PERMISSIONS.TENANT_FLEET_LEDGER_READ.key,
      },
      {
        href: "/admin/ledger/expenses",
        key: "expensesLedger",
        title: "Expenses Ledger",
        icon: "IconWallet",
        permission: PERMISSIONS.TENANT_FLEET_LEDGER_READ.key,
      },
    ],
  },
  {
    href: "/admin/bank-accounts",
    key: "bankAccounts",
    title: "Bank Accounts",
    icon: "IconBuildingBank",
    permission: PERMISSIONS.TENANT_FLEET_BANK_ACCOUNTS_READ.key,
  },
  {
    key: "management",
    title: "Management",
    icon: "IconBuilding",
    children: [
      {
        href: "/admin/organizations",
        key: "organizations",
        title: "Managed Stations",
        icon: "IconGasStation",
        permission: PERMISSIONS.TENANT_FLEET_ORGANIZATIONS_READ.key,
      },
      {
        href: "/admin/customers",
        key: "clients",
        title: "B2B Clients",
        icon: "IconUsers",
        permission: PERMISSIONS.TENANT_FLEET_CUSTOMERS_READ.key,
      },
      {
        href: "/admin/transporters",
        key: "transporters",
        title: "Transporters",
        icon: "IconBuilding",
        permission: PERMISSIONS.TENANT_FLEET_TRUCKS_READ.key,
      },
      {
        href: "/admin/trucks",
        key: "trucks",
        title: "Trucks",
        icon: "IconTruck",
        permission: PERMISSIONS.TENANT_FLEET_TRUCKS_READ.key,
      },
      {
        href: "/admin/drivers",
        key: "drivers",
        title: "Drivers",
        icon: "IconUser",
        permission: PERMISSIONS.TENANT_FLEET_DRIVERS_READ.key,
      },
    ],
  },
  {
    key: "system",
    title: "System",
    icon: "IconSettings",
    children: [
      {
        href: "/admin/users",
        key: "users",
        title: "Users",
        icon: "IconUsers",
        permission: PERMISSIONS.TENANT_USERS_READ.key,
      },
      {
        href: "/admin/role-templates",
        key: "roles",
        title: "Roles & Permissions",
        icon: "IconShield",
        permission: PERMISSIONS.TENANT_ROLES_READ.key,
      },
      {
        href: "/admin/activity",
        key: "activity",
        title: "Activity",
        icon: "IconActivity",
        permission: PERMISSIONS.TENANT_FLEET_ACTIVITY_READ.key,
      },
      // {
      //   href: "/admin/templates",
      //   key: "templates",
      //   title: "Templates",
      //   icon: "IconFileText",
      //   permission: PERMISSIONS.TENANT_FLEET_TEMPLATES_READ.key,
      // },
      {
        href: "/admin/notifications",
        key: "notifications",
        title: "Notifications",
        icon: "IconBell",
        permission: PERMISSIONS.TENANT_FLEET_NOTIFICATIONS_READ.key,
      },
      {
        href: "/admin/settings",
        key: "settings",
        title: "Settings",
        icon: "IconSettings",
        permission: PERMISSIONS.TENANT_FLEET_SETTINGS_READ.key,
      },
    ],
  },
];

export default async function FleetDashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireTenantPage(undefined, "FLEET");

  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: { email: true, firstName: true, lastName: true, fleetPermissions: true },
  });
  if (!user) redirect("/admin/auth/login");

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
      modules: {
        where: { status: "ACTIVE" }
      }
    },
  });
  if (!tenant || tenant.status !== "ACTIVE") redirect("/maintenance");

  // Check if Fleet is enabled either in relational modules or legacy activeModules
  const hasFleetModule = tenant.modules.some(m => m.module === "FLEET") || tenant.activeModules.includes("FLEET");
  const hasStationModule = tenant.modules.some(m => m.module === "STATION") || tenant.activeModules.includes("STATION");
  
  if (!hasFleetModule) {
    if (hasStationModule) {
      redirect("/admin/station");
    } else {
      redirect("/admin/auth/login?error=no_access");
    }
  }
  const settings = parseTenantSettings(tenant.settingsJson);
  
  const logoUrl =
    settings.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings.logoKey && s3Configured()
      ? publicUrlForKey(settings.logoKey)
      : null;

  // Fetch stations for the command modal switcher
  const userWithStations = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: {
      stations: {
        select: {
          id: true,
          name: true,
          code: true,
          organization: { select: { name: true, slug: true, logoKey: true, type: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  let allowedStations = userWithStations?.stations || [];
  if (allowedStations.length === 0) {
    allowedStations = await prisma.station.findMany({
      where: { tenantId: actor.tenantId },
      select: {
        id: true,
        name: true,
        code: true,
        organization: { select: { name: true, slug: true, logoKey: true, type: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  const allInternalOrgs = await prisma.organization.findMany({
    where: { tenantId: actor.tenantId, type: "INTERNAL" },
    select: { id: true, name: true, slug: true, logoKey: true },
    orderBy: { name: "asc" }
  });

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
      },
    };
  });
  
  // Fleet nav must not inherit station permissions (e.g. tenant.users:read).
  const fleetPermSet = new Set(user.fleetPermissions);
  const canSeeNav = (permission: string | string[] | null | undefined) => {
    if (!permission) return true;
    if (actor.isOwner) return true;
    const keys = Array.isArray(permission) ? permission : [permission];
    return keys.some((key) => fleetPermSet.has(key));
  };

  const nav = FLEET_NAV.map((n: any) => {
    const children = n.children
      ? n.children
          .filter((c: any) => canSeeNav(c.permission))
          .map((c: any) => ({
            href: c.href,
            title: c.title,
            icon: c.icon,
          }))
      : undefined;

    if (n.children && (!children || children.length === 0)) {
      return null;
    }

    if (!n.children && !canSeeNav(n.permission)) {
      return null;
    }

    return {
      href: n.href,
      title: n.title,
      icon: n.icon,
      children: children?.length ? children : undefined,
    };
  }).filter(Boolean) as any[];

  const label = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  return (
    <DashboardLayoutShell
      title={tenant.name ?? "Tenant"}
      logoUrl={logoUrl}
      navItems={nav}
      user={{ name: label, email: user.email }}
      roleLabel="Fleet Manager"
      logoutEndpoint="/api/auth/logout"
      logoutRedirect="/admin/auth/login"
      logoutContext="tenant-admin"
      stations={mappedStations}
      internalOrganizations={internalOrganizations}
      enabledModules={Array.from(new Set([
        ...settings.enabledModules,
        ...(tenant.activeModules?.map((m: string) => m.toLowerCase()) || []),
        ...(tenant.modules?.map((m: any) => m.module.toLowerCase()) || [])
      ]))}
      tenant={{
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: logoUrl,
        email: tenant.companyEmail,
        phone: tenant.companyPhone,
        address:
          [tenant.addressLine1, tenant.addressLine2, tenant.city, tenant.region]
            .filter(Boolean)
            .join(", ") || null,
      }}
      profileHref="/admin/profile"
    >
      <UnauthorizedToast />
      {children}
    </DashboardLayoutShell>
  );
}
