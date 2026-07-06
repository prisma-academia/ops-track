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
  { href: "/admin/fleet/transporters", key: "transporters", icon: "Building2", permission: PERMISSIONS.TENANT_FLEET_READ.key },
  { href: "/admin/fleet/trucks", key: "trucks", icon: "Truck", permission: PERMISSIONS.TENANT_FLEET_READ.key },
  { href: "/admin/fleet/drivers", key: "drivers", icon: "Users", permission: PERMISSIONS.TENANT_FLEET_READ.key },
  { href: "/admin/fleet/orders", key: "orders", icon: "ShoppingCart", permission: PERMISSIONS.TENANT_FLEET_READ.key },
  { href: "/admin/fleet/transports", key: "transports", icon: "Route", permission: PERMISSIONS.TENANT_FLEET_READ.key },
  { href: "/admin/fleet/sales", key: "customers", icon: "BadgeDollarSign", permission: PERMISSIONS.TENANT_FLEET_READ.key },
  { href: "/admin/fleet/ledger", key: "transactions", icon: "Wallet", permission: PERMISSIONS.TENANT_FLEET_READ.key },
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
    select: { name: true, status: true, settingsJson: true, activeModules: true },
  });
  if (!tenant || tenant.status !== "ACTIVE") redirect("/maintenance");

  // Check if Fleet is enabled
  if (!tenant.activeModules.includes("FLEET")) {
    redirect("/admin/dashboard");
  }

  const tNav = await getTranslations("nav");
  const settings = parseTenantSettings(tenant.settingsJson);
  
  const logoUrl =
    settings.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings.logoKey && s3Configured()
      ? publicUrlForKey(settings.logoKey)
      : null;
  
  const nav = FLEET_NAV.filter(
    (n) => (!n.permission || hasPermission(actor, n.permission as any))
  ).map(n => {
    let title = n.key;
    try { title = tNav(n.key as any); } catch(e) {}
    if (n.key === 'transporters') title = 'Transporters';
    if (n.key === 'trucks') title = 'Trucks';
    if (n.key === 'drivers') title = 'Drivers';
    if (n.key === 'orders') title = 'Orders';
    if (n.key === 'transports') title = 'Transports';
    if (n.key === 'sales') title = 'Sales';
    if (n.key === 'transactions') title = 'Ledger';

    return {
      href: n.href,
      title,
      icon: n.icon,
    };
  });

  const label = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
  return (
    <DashboardLayoutShell
      title={`${tenant.name} - Fleet`}
      logoUrl={logoUrl}
      navItems={nav}
      user={{ name: label, email: user.email }}
      roleLabel="Fleet Manager"
      logoutEndpoint="/api/auth/logout"
      logoutRedirect="/admin/auth/login"
      logoutContext="tenant-admin"
    >
      <UnauthorizedToast />
      {children}
    </DashboardLayoutShell>
  );
}
