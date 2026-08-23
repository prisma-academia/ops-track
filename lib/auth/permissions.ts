export const PERMISSIONS = {
  // Platform-scope
  PLATFORM_TENANTS_READ: { key: "platform.tenants:read", module: "platform.tenants", description: "View tenants" },
  PLATFORM_TENANTS_WRITE: { key: "platform.tenants:write", module: "platform.tenants", description: "Create / modify tenants" },
  PLATFORM_USERS_READ: { key: "platform.users:read", module: "platform.users", description: "View platform users" },
  PLATFORM_USERS_WRITE: { key: "platform.users:write", module: "platform.users", description: "Invite / modify platform users" },
  PLATFORM_ROLES_READ: { key: "platform.roles:read", module: "platform.roles", description: "View platform role templates" },
  PLATFORM_ROLES_WRITE: { key: "platform.roles:write", module: "platform.roles", description: "Modify platform role templates" },
  PLATFORM_ACTIVITY_READ: { key: "platform.activity:read", module: "platform.activity", description: "View platform-wide activity log" },
  PLATFORM_SETTINGS_WRITE: { key: "platform.settings:write", module: "platform.settings", description: "Modify platform settings" },
  // Tenant-scope
  TENANT_USERS_READ: { key: "tenant.users:read", module: "tenant.users", description: "View tenant users" },
  TENANT_USERS_WRITE: { key: "tenant.users:write", module: "tenant.users", description: "Invite / modify tenant users" },
  TENANT_CLIENTS_READ: { key: "tenant.clients:read", module: "tenant.clients", description: "View clients" },
  TENANT_CLIENTS_WRITE: { key: "tenant.clients:write", module: "tenant.clients", description: "Create / modify clients" },
  TENANT_ROLES_READ: { key: "tenant.roles:read", module: "tenant.roles", description: "View tenant role templates" },
  TENANT_ROLES_WRITE: { key: "tenant.roles:write", module: "tenant.roles", description: "Modify tenant role templates" },
  TENANT_STATIONS_READ: { key: "tenant.stations:read", module: "tenant.stations", description: "View stations, tanks & pricing" },
  TENANT_STATIONS_WRITE: { key: "tenant.stations:write", module: "tenant.stations", description: "Manage stations, tanks & pricing" },
  TENANT_WAYBILLS_READ: { key: "tenant.waybills:read", module: "tenant.waybills", description: "View waybills" },
  TENANT_WAYBILLS_WRITE: { key: "tenant.waybills:write", module: "tenant.waybills", description: "Manage waybills" },
  TENANT_SHIFTS_READ: { key: "tenant.shifts:read", module: "tenant.shifts", description: "View shifts" },
  TENANT_SHIFTS_WRITE: { key: "tenant.shifts:write", module: "tenant.shifts", description: "Manage shifts" },
  TENANT_DIPPINGS_READ: { key: "tenant.dippings:read", module: "tenant.dippings", description: "View dippings" },
  TENANT_DIPPINGS_WRITE: { key: "tenant.dippings:write", module: "tenant.dippings", description: "Manage dippings" },
  TENANT_PRICES_READ: { key: "tenant.prices:read", module: "tenant.prices", description: "View prices" },
  TENANT_PRICES_WRITE: { key: "tenant.prices:write", module: "tenant.prices", description: "Manage prices" },
  TENANT_EXPENSES_READ: { key: "tenant.expenses:read", module: "tenant.expenses", description: "View expenses" },
  TENANT_EXPENSES_WRITE: { key: "tenant.expenses:write", module: "tenant.expenses", description: "Manage expenses" },
  TENANT_TICKETS_READ: { key: "tenant.tickets:read", module: "tenant.tickets", description: "View tickets and inventory alerts" },
  TENANT_TICKETS_WRITE: { key: "tenant.tickets:write", module: "tenant.tickets", description: "Resolve tickets and inventory alerts" },
  TENANT_NOTIFICATIONS_READ: { key: "tenant.notifications:read", module: "tenant.notifications", description: "View station notifications" },
  TENANT_NOTIFICATIONS_WRITE: { key: "tenant.notifications:write", module: "tenant.notifications", description: "Compose and send station notifications" },
  TENANT_FLEET_READ: { key: "tenant.fleet:read", module: "tenant.fleet", description: "View fleet operations (General)" },
  TENANT_FLEET_WRITE: { key: "tenant.fleet:write", module: "tenant.fleet", description: "Manage fleet operations (General)" },
  TENANT_FLEET_ORDERS_READ: { key: "tenant.fleet.orders:read", module: "tenant.fleet.orders", description: "View fleet orders" },
  TENANT_FLEET_ORDERS_WRITE: { key: "tenant.fleet.orders:write", module: "tenant.fleet.orders", description: "Manage fleet orders" },
  TENANT_FLEET_TRANSPORTS_READ: { key: "tenant.fleet.transports:read", module: "tenant.fleet.transports", description: "View fleet transports" },
  TENANT_FLEET_TRANSPORTS_WRITE: { key: "tenant.fleet.transports:write", module: "tenant.fleet.transports", description: "Manage fleet transports" },
  TENANT_FLEET_SALES_READ: { key: "tenant.fleet.sales:read", module: "tenant.fleet.sales", description: "View fleet sales" },
  TENANT_FLEET_SALES_WRITE: { key: "tenant.fleet.sales:write", module: "tenant.fleet.sales", description: "Manage fleet sales" },
  TENANT_FLEET_PAYMENTS_READ: { key: "tenant.fleet.payments:read", module: "tenant.fleet.payments", description: "View fleet payments" },
  TENANT_FLEET_PAYMENTS_WRITE: { key: "tenant.fleet.payments:write", module: "tenant.fleet.payments", description: "Manage fleet payments" },
  TENANT_FLEET_TRUCKS_READ: { key: "tenant.fleet.trucks:read", module: "tenant.fleet.trucks", description: "View fleet trucks & transporters" },
  TENANT_FLEET_TRUCKS_WRITE: { key: "tenant.fleet.trucks:write", module: "tenant.fleet.trucks", description: "Manage fleet trucks & transporters" },
  TENANT_FLEET_DRIVERS_READ: { key: "tenant.fleet.drivers:read", module: "tenant.fleet.drivers", description: "View fleet drivers" },
  TENANT_FLEET_DRIVERS_WRITE: { key: "tenant.fleet.drivers:write", module: "tenant.fleet.drivers", description: "Manage fleet drivers" },
  // Mobile app permissions
  MOBILE_TENANT_DIPPINGS_READ: { key: "mobile.tenant.dippings:read", module: "mobile.tenant.dippings", description: "Mobile app: View dippings" },
  MOBILE_TENANT_DIPPINGS_WRITE: { key: "mobile.tenant.dippings:write", module: "mobile.tenant.dippings", description: "Mobile app: Manage dippings" },
  MOBILE_TENANT_REPORTS_READ: { key: "mobile.tenant.reports:read", module: "mobile.tenant.reports", description: "Mobile app: View reports" },
  MOBILE_TENANT_REPORTS_WRITE: { key: "mobile.tenant.reports:write", module: "mobile.tenant.reports", description: "Mobile app: Manage reports" },
  MOBILE_TENANT_SHIFTS_READ: { key: "mobile.tenant.shifts:read", module: "mobile.tenant.shifts", description: "Mobile app: View shifts" },
  MOBILE_TENANT_SHIFTS_WRITE: { key: "mobile.tenant.shifts:write", module: "mobile.tenant.shifts", description: "Mobile app: Manage shifts" },
  MOBILE_TENANT_EXPENSES_READ: { key: "mobile.tenant.expenses:read", module: "mobile.tenant.expenses", description: "Mobile app: View expenses" },
  MOBILE_TENANT_EXPENSES_WRITE: { key: "mobile.tenant.expenses:write", module: "mobile.tenant.expenses", description: "Mobile app: Manage expenses" },
  MOBILE_TENANT_TICKETS_READ: { key: "mobile.tenant.tickets:read", module: "mobile.tenant.tickets", description: "Mobile app: View tickets" },
  MOBILE_TENANT_TICKETS_WRITE: { key: "mobile.tenant.tickets:write", module: "mobile.tenant.tickets", description: "Mobile app: Submit tickets" },
  MOBILE_TENANT_ATTENDANTS_READ: { key: "mobile.tenant.attendants:read", module: "mobile.tenant.attendants", description: "Mobile app: View attendants" },
  MOBILE_TENANT_ATTENDANTS_WRITE: { key: "mobile.tenant.attendants:write", module: "mobile.tenant.attendants", description: "Mobile app: Manage attendants" },
  MOBILE_TENANT_WAYBILLS_READ: { key: "mobile.tenant.waybills:read", module: "mobile.tenant.waybills", description: "Mobile app: View waybills" },
  MOBILE_TENANT_WAYBILLS_WRITE: { key: "mobile.tenant.waybills:write", module: "mobile.tenant.waybills", description: "Mobile app: Manage waybills" },
  MOBILE_TENANT_NOTIFICATIONS_READ: { key: "mobile.tenant.notifications:read", module: "mobile.tenant.notifications", description: "Mobile app: View in-app notifications" },
  // Missing Station Modules
  TENANT_BANK_ACCOUNTS_READ: { key: "tenant.bank-accounts:read", module: "tenant.bank-accounts", description: "View bank accounts" },
  TENANT_BANK_ACCOUNTS_WRITE: { key: "tenant.bank-accounts:write", module: "tenant.bank-accounts", description: "Manage bank accounts" },
  TENANT_PROFIT_REPORTS_READ: { key: "tenant.profit-reports:read", module: "tenant.profit-reports", description: "View profit reports" },
  TENANT_SALES_REPORTS_READ: { key: "tenant.sales-reports:read", module: "tenant.sales-reports", description: "View sales reports" },
  TENANT_STOCK_REPORTS_READ: { key: "tenant.stock-reports:read", module: "tenant.stock-reports", description: "View stock reports" },
  TENANT_VARIANCE_AUDIT_READ: { key: "tenant.variance-audit:read", module: "tenant.variance-audit", description: "View variance audit" },
  TENANT_VARIANCE_AUDIT_WRITE: { key: "tenant.variance-audit:write", module: "tenant.variance-audit", description: "Manage variance audit" },
  // Missing Fleet Modules
  TENANT_FLEET_LEDGER_READ: { key: "tenant.fleet.ledger:read", module: "tenant.fleet.ledger", description: "View fleet ledger" },
  TENANT_FLEET_LEDGER_WRITE: { key: "tenant.fleet.ledger:write", module: "tenant.fleet.ledger", description: "Manage fleet ledger" },
  TENANT_FLEET_CUSTOMERS_READ: { key: "tenant.fleet.customers:read", module: "tenant.fleet.customers", description: "View fleet customers" },
  TENANT_FLEET_CUSTOMERS_WRITE: { key: "tenant.fleet.customers:write", module: "tenant.fleet.customers", description: "Manage fleet customers" },
  TENANT_FLEET_BANK_ACCOUNTS_READ: { key: "tenant.fleet.bank-accounts:read", module: "tenant.fleet.bank-accounts", description: "View fleet bank accounts" },
  TENANT_FLEET_BANK_ACCOUNTS_WRITE: { key: "tenant.fleet.bank-accounts:write", module: "tenant.fleet.bank-accounts", description: "Manage fleet bank accounts" },
  TENANT_FLEET_ACTIVITY_READ: { key: "tenant.fleet.activity:read", module: "tenant.fleet.activity", description: "View fleet activity log" },
  TENANT_FLEET_SETTINGS_READ: { key: "tenant.fleet.settings:read", module: "tenant.fleet.settings", description: "View fleet settings" },
  TENANT_FLEET_SETTINGS_WRITE: { key: "tenant.fleet.settings:write", module: "tenant.fleet.settings", description: "Manage fleet settings" },
  TENANT_FLEET_ORGANIZATIONS_READ: { key: "tenant.fleet.organizations:read", module: "tenant.fleet.organizations", description: "View managed stations / organizations" },
  TENANT_FLEET_ORGANIZATIONS_WRITE: { key: "tenant.fleet.organizations:write", module: "tenant.fleet.organizations", description: "Manage stations / organizations" },
  TENANT_FLEET_TEMPLATES_READ: { key: "tenant.fleet.templates:read", module: "tenant.fleet.templates", description: "View templates" },
  TENANT_FLEET_TEMPLATES_WRITE: { key: "tenant.fleet.templates:write", module: "tenant.fleet.templates", description: "Modify templates" },
  TENANT_FLEET_REPORTS_READ: { key: "tenant.fleet.reports:read", module: "tenant.fleet.reports", description: "View fleet reports (sales, station performance, transport)" },
  TENANT_FLEET_NOTIFICATIONS_READ: { key: "tenant.fleet.notifications:read", module: "tenant.fleet.notifications", description: "View fleet notifications" },
  TENANT_FLEET_NOTIFICATIONS_WRITE: { key: "tenant.fleet.notifications:write", module: "tenant.fleet.notifications", description: "Compose and send fleet notifications" },
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]["key"];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ALL_PLATFORM_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS
  .filter((p) => p.key.startsWith("platform."))
  .map((p) => p.key as PermissionKey);

export const ALL_MOBILE_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS
  .filter((p) => p.key.startsWith("mobile.tenant."))
  .map((p) => p.key as PermissionKey);

export function isFleetPermissionKey(key: string): boolean {
  return (
    key.startsWith("tenant.fleet") ||
    key.startsWith("tenant.users:") ||
    key.startsWith("tenant.roles:")
  );
}

export function isMobilePermissionKey(key: string): boolean {
  return key.startsWith("mobile.tenant.");
}

export function splitTenantPermissions(keys: readonly string[]): {
  fleetPermissions: string[];
  stationPermissions: string[];
} {
  const fleetPermissions: string[] = [];
  const stationPermissions: string[] = [];
  for (const key of keys) {
    if (isFleetPermissionKey(key)) fleetPermissions.push(key);
    else stationPermissions.push(key);
  }
  return { fleetPermissions, stationPermissions };
}

export const ALL_FLEET_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS
  .filter((p) => isFleetPermissionKey(p.key))
  .map((p) => p.key as PermissionKey);

export const ALL_TENANT_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS
  .filter((p) => p.key.startsWith("tenant.") || p.key.startsWith("mobile.tenant."))
  .map((p) => p.key as PermissionKey);

// Built-in tenant role templates seeded per-tenant on tenant creation.
export const TENANT_BUILTIN_ROLES = [
  { name: "Owner", permissions: ALL_TENANT_PERMISSION_KEYS, isSystem: true, module: "STATION" },
  { name: "Owner", permissions: ALL_TENANT_PERMISSION_KEYS, isSystem: true, module: "FLEET" },
  {
    name: "Admin",
    permissions: ALL_TENANT_PERMISSION_KEYS.filter((k) => !k.endsWith("settings:write")) as PermissionKey[],
    isSystem: true,
    module: "STATION",
  },
  {
    name: "Admin",
    permissions: ALL_TENANT_PERMISSION_KEYS.filter((k) => !k.endsWith("settings:write")) as PermissionKey[],
    isSystem: true,
    module: "FLEET",
  },
  {
    name: "Cashier",
    permissions: [
      PERMISSIONS.TENANT_STATIONS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.TENANT_EXPENSES_READ.key,
      PERMISSIONS.TENANT_EXPENSES_WRITE.key,
      PERMISSIONS.TENANT_CLIENTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_EXPENSES_READ.key,
      PERMISSIONS.MOBILE_TENANT_EXPENSES_WRITE.key,
      PERMISSIONS.TENANT_TICKETS_READ.key,
      PERMISSIONS.MOBILE_TENANT_TICKETS_READ.key,
      PERMISSIONS.MOBILE_TENANT_TICKETS_WRITE.key,
    ] as PermissionKey[],
    isSystem: true,
    module: "STATION",
  },
] as const;

export type PlatformActor = {
  kind: "platform";
  userId: string;
  isSuperAdmin: boolean;
  permissions: ReadonlySet<string>;
};

export type TenantActor = {
  kind: "tenant";
  userId: string;
  tenantId: string;
  isOwner: boolean;
  organizationId: string | null;
  permissions: ReadonlySet<string>;
};

export type ClientActor = {
  kind: "client";
  clientId: string;
  tenantId: string;
};

export type AnyActor = PlatformActor | TenantActor | ClientActor;

export function hasPermission(actor: PlatformActor | TenantActor, key: PermissionKey): boolean {
  if (actor.kind === "platform" && actor.isSuperAdmin) return true;
  if (actor.kind === "tenant" && actor.isOwner) return true;
  return actor.permissions.has(key);
}
