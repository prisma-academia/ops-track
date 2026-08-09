import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { DashboardLayoutShell } from "@/components/dashboard-layout-shell";
import { PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import { UnauthorizedToast } from "@/components/unauthorized-toast";

const FLEET_NAV = [
  { href: "/admin/fleet", key: "overview", icon: "LayoutDashboard", permission: null },
  { href: "/admin/fleet/organizations", key: "organizations", icon: "Network", permission: PERMISSIONS.TENANT_ORGS_READ.key },
  { href: "/admin/fleet/users", key: "users", icon: "Users", permission: PERMISSIONS.TENANT_USERS_READ.key },
  {
    href: "/admin/fleet/assets",
    key: "assets",
    icon: "Building",
    permission: PERMISSIONS.TENANT_FLEET_READ.key,
    children: [
      { href: "/admin/fleet/transporters", key: "transporters", icon: "Building2", permission: PERMISSIONS.TENANT_FLEET_READ.key },
      { href: "/admin/fleet/trucks", key: "trucks", icon: "Truck", permission: PERMISSIONS.TENANT_FLEET_READ.key },
      { href: "/admin/fleet/drivers", key: "drivers", icon: "Users", permission: PERMISSIONS.TENANT_FLEET_READ.key },
    ]
  },
  { href: "/admin/fleet/orders", key: "orders", icon: "ShoppingCart", permission: PERMISSIONS.TENANT_FLEET_READ.key },
  { href: "/admin/fleet/transports", key: "transports", icon: "Route", permission: PERMISSIONS.TENANT_FLEET_READ.key },
  {
    href: "/admin/fleet/finance",
    key: "finance",
    icon: "Banknote",
    permission: PERMISSIONS.TENANT_FLEET_READ.key,
    children: [
      { href: "/admin/fleet/sales", key: "sales", icon: "BadgeDollarSign", permission: PERMISSIONS.TENANT_FLEET_READ.key },
      { href: "/admin/fleet/payments", key: "payments", icon: "CreditCard", permission: PERMISSIONS.TENANT_FLEET_READ.key },
      { href: "/admin/fleet/bank-accounts", key: "bankAccounts", icon: "Landmark", permission: PERMISSIONS.TENANT_SETTINGS_READ.key },
      { href: "/admin/fleet/fleet-pnl-report", key: "fleetPnlReport", icon: "FileText", permission: PERMISSIONS.TENANT_FLEET_ORDERS_READ.key },
    ]
  },
  { href: "/admin/fleet/customers", key: "clients", icon: "Users", permission: PERMISSIONS.TENANT_CUSTOMERS_READ.key },
  { 
    href: "/admin/fleet/ledger", 
    key: "transactions", 
    icon: "Wallet", 
    permission: PERMISSIONS.TENANT_FLEET_READ.key
  },
  { href: "/admin/fleet/role-templates", key: "roles", icon: "Shield", permission: PERMISSIONS.TENANT_ROLES_READ.key },
  { href: "/admin/fleet/activity", key: "activity", icon: "Activity", permission: PERMISSIONS.TENANT_ACTIVITY_READ.key },
  { href: "/admin/fleet/settings", key: "settings", icon: "Settings", permission: PERMISSIONS.TENANT_SETTINGS_READ.key },
];

export default async function FleetDashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireTenantPage();

  const user = await prisma.tenantUser.findUnique({
    where: { id: actor.userId },
    select: { email: true, firstName: true, lastName: true },
  });
  if (!user) redirect("/admin/auth/login");

  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
    select: { name: true, slug: true, status: true, settingsJson: true, activeModules: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") redirect("/maintenance");

  // Check if Fleet is enabled
  if (!tenant.activeModules.includes("FLEET")) {
    if (tenant.activeModules.includes("STATION")) {
      redirect("/admin/dashboard");
    } else {
      redirect("/admin/modules");
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
  
  const nav = FLEET_NAV.filter(
    (n) => (!n.permission || hasPermission(actor, n.permission as any))
  ).map(n => {
    let title = n.key;
    if (n.key === 'overview') title = 'Overview';
    if (n.key === 'assets') title = 'Fleet Assets';
    if (n.key === 'orders') title = 'Orders';
    if (n.key === 'transports') title = 'Logistic Transport';
    if (n.key === 'finance') title = 'Account & Finance';
    if (n.key === 'transactions') title = 'Payments Ledger';
    if (n.key === 'clients') title = 'Customers';
    if (n.key === 'organizations') title = 'Organizations';
    if (n.key === 'users') title = 'Users';
    if (n.key === 'roles') title = 'Role Templates';
    if (n.key === 'activity') title = 'Activity Logs';
    if (n.key === 'settings') title = 'Settings';

    const children = n.children
      ? n.children
          .filter((c: any) => !c.permission || hasPermission(actor, c.permission))
          .map((c: any) => {
            let childTitle = c.key;
            if (c.key === 'transporters') childTitle = 'Transporters';
            if (c.key === 'trucks') childTitle = 'Trucks';
            if (c.key === 'drivers') childTitle = 'Drivers';
            if (c.key === 'sales') childTitle = 'Sales';
            if (c.key === 'payments') childTitle = 'Payments';
            if (c.key === 'bankAccounts') childTitle = 'Bank Accounts';
            if (c.key === 'fleetPnlReport') childTitle = 'Profit & Loss';
            return {
              href: c.href,
              title: childTitle,
              icon: c.icon,
            };
          })
      : undefined;

    return {
      href: n.href,
      title,
      icon: n.icon,
      children: children?.length ? children : undefined,
    };
  });

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
      enabledModules={Array.from(new Set([
        ...settings.enabledModules,
        ...(tenant.activeModules?.map((m: string) => m.toLowerCase()) || [])
      ]))}
      tenant={{
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: logoUrl,
      }}
    >
      <UnauthorizedToast />
      {children}
    </DashboardLayoutShell>
  );
}
