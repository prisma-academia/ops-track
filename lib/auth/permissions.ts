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
  TENANT_ACTIVITY_READ: { key: "tenant.activity:read", module: "tenant.activity", description: "View tenant activity log" },
  TENANT_TEMPLATES_READ: { key: "tenant.templates:read", module: "tenant.templates", description: "View templates" },
  TENANT_TEMPLATES_WRITE: { key: "tenant.templates:write", module: "tenant.templates", description: "Modify templates" },
  TENANT_SETTINGS_READ: { key: "tenant.settings:read", module: "tenant.settings", description: "View tenant settings" },
  TENANT_SETTINGS_WRITE: { key: "tenant.settings:write", module: "tenant.settings", description: "Modify tenant settings" },
  TENANT_STATIONS_READ: { key: "tenant.stations:read", module: "tenant.stations", description: "View stations, tanks & pricing" },
  TENANT_STATIONS_WRITE: { key: "tenant.stations:write", module: "tenant.stations", description: "Manage stations, tanks & pricing" },
  TENANT_WAYBILLS_READ: { key: "tenant.waybills:read", module: "tenant.waybills", description: "View waybills" },
  TENANT_WAYBILLS_WRITE: { key: "tenant.waybills:write", module: "tenant.waybills", description: "Manage waybills" },
  TENANT_CUSTOMERS_READ: { key: "tenant.customers:read", module: "tenant.customers", description: "View customer accounts" },
  TENANT_CUSTOMERS_WRITE: { key: "tenant.customers:write", module: "tenant.customers", description: "Manage customer accounts and balances" },
  TENANT_SHIFTS_READ: { key: "tenant.shifts:read", module: "tenant.shifts", description: "View shifts" },
  TENANT_SHIFTS_WRITE: { key: "tenant.shifts:write", module: "tenant.shifts", description: "Manage shifts" },
  TENANT_DIPPINGS_READ: { key: "tenant.dippings:read", module: "tenant.dippings", description: "View dippings" },
  TENANT_DIPPINGS_WRITE: { key: "tenant.dippings:write", module: "tenant.dippings", description: "Manage dippings" },
  TENANT_DISPATCHES_READ: { key: "tenant.dispatches:read", module: "tenant.dispatches", description: "View dispatches" },
  TENANT_DISPATCHES_WRITE: { key: "tenant.dispatches:write", module: "tenant.dispatches", description: "Manage dispatches" },
  TENANT_PRICES_READ: { key: "tenant.prices:read", module: "tenant.prices", description: "View prices" },
  TENANT_PRICES_WRITE: { key: "tenant.prices:write", module: "tenant.prices", description: "Manage prices" },
  TENANT_EXPENSES_READ: { key: "tenant.expenses:read", module: "tenant.expenses", description: "View expenses" },
  TENANT_EXPENSES_WRITE: { key: "tenant.expenses:write", module: "tenant.expenses", description: "Manage expenses" },
  TENANT_FLEET_READ: { key: "tenant.fleet:read", module: "tenant.fleet", description: "View fleet operations" },
  TENANT_FLEET_WRITE: { key: "tenant.fleet:write", module: "tenant.fleet", description: "Manage fleet operations" },
  // Mobile app permissions
  MOBILE_TENANT_DIPPINGS_READ: { key: "mobile.tenant.dippings:read", module: "mobile.tenant.dippings", description: "Mobile app: View dippings" },
  MOBILE_TENANT_DIPPINGS_WRITE: { key: "mobile.tenant.dippings:write", module: "mobile.tenant.dippings", description: "Mobile app: Manage dippings" },
  MOBILE_TENANT_REPORTS_READ: { key: "mobile.tenant.reports:read", module: "mobile.tenant.reports", description: "Mobile app: View reports" },
  MOBILE_TENANT_REPORTS_WRITE: { key: "mobile.tenant.reports:write", module: "mobile.tenant.reports", description: "Mobile app: Manage reports" },
  MOBILE_TENANT_SHIFTS_READ: { key: "mobile.tenant.shifts:read", module: "mobile.tenant.shifts", description: "Mobile app: View shifts" },
  MOBILE_TENANT_SHIFTS_WRITE: { key: "mobile.tenant.shifts:write", module: "mobile.tenant.shifts", description: "Mobile app: Manage shifts" },
  MOBILE_TENANT_EXPENSES_READ: { key: "mobile.tenant.expenses:read", module: "mobile.tenant.expenses", description: "Mobile app: View expenses" },
  MOBILE_TENANT_EXPENSES_WRITE: { key: "mobile.tenant.expenses:write", module: "mobile.tenant.expenses", description: "Mobile app: Manage expenses" },
  MOBILE_TENANT_ATTENDANTS_READ: { key: "mobile.tenant.attendants:read", module: "mobile.tenant.attendants", description: "Mobile app: View attendants" },
  MOBILE_TENANT_ATTENDANTS_WRITE: { key: "mobile.tenant.attendants:write", module: "mobile.tenant.attendants", description: "Mobile app: Manage attendants" },
  MOBILE_TENANT_WAYBILLS_READ: { key: "mobile.tenant.waybills:read", module: "mobile.tenant.waybills", description: "Mobile app: View waybills" },
  MOBILE_TENANT_WAYBILLS_WRITE: { key: "mobile.tenant.waybills:write", module: "mobile.tenant.waybills", description: "Mobile app: Manage waybills" },
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]["key"];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ALL_PLATFORM_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS
  .filter((p) => p.key.startsWith("platform."))
  .map((p) => p.key as PermissionKey);

export const ALL_TENANT_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS
  .filter((p) => p.key.startsWith("tenant.") || p.key.startsWith("mobile.tenant."))
  .map((p) => p.key as PermissionKey);

// Built-in tenant role templates seeded per-tenant on tenant creation.
export const TENANT_BUILTIN_ROLES = [
  { name: "Owner", permissions: ALL_TENANT_PERMISSION_KEYS, isSystem: true },
  {
    name: "Admin",
    permissions: ALL_TENANT_PERMISSION_KEYS.filter((k) => !k.endsWith("settings:write")) as PermissionKey[],
    isSystem: true,
  },
  {
    name: "Regional Manager",
    permissions: [
      PERMISSIONS.TENANT_USERS_READ.key,
      PERMISSIONS.TENANT_CLIENTS_READ.key,
      PERMISSIONS.TENANT_STATIONS_READ.key,
      PERMISSIONS.TENANT_STATIONS_WRITE.key,
      PERMISSIONS.TENANT_WAYBILLS_READ.key,
      PERMISSIONS.TENANT_WAYBILLS_WRITE.key,
      PERMISSIONS.TENANT_CUSTOMERS_READ.key,
      PERMISSIONS.TENANT_CUSTOMERS_WRITE.key,
      PERMISSIONS.TENANT_SHIFTS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.TENANT_DIPPINGS_READ.key,
      PERMISSIONS.TENANT_DIPPINGS_WRITE.key,
      PERMISSIONS.TENANT_DISPATCHES_READ.key,
      PERMISSIONS.TENANT_DISPATCHES_WRITE.key,
      PERMISSIONS.TENANT_PRICES_READ.key,
      PERMISSIONS.TENANT_PRICES_WRITE.key,
      PERMISSIONS.TENANT_EXPENSES_READ.key,
      PERMISSIONS.TENANT_EXPENSES_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_DIPPINGS_READ.key,
      PERMISSIONS.MOBILE_TENANT_DIPPINGS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_REPORTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_REPORTS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_EXPENSES_READ.key,
      PERMISSIONS.MOBILE_TENANT_EXPENSES_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_ATTENDANTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_ATTENDANTS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_WAYBILLS_READ.key,
      PERMISSIONS.MOBILE_TENANT_WAYBILLS_WRITE.key,
    ] as PermissionKey[],
    isSystem: true,
  },
  {
    name: "Station Manager",
    permissions: [
      PERMISSIONS.TENANT_USERS_READ.key,
      PERMISSIONS.TENANT_STATIONS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.TENANT_DIPPINGS_READ.key,
      PERMISSIONS.TENANT_DIPPINGS_WRITE.key,
      PERMISSIONS.TENANT_DISPATCHES_READ.key,
      PERMISSIONS.TENANT_DISPATCHES_WRITE.key,
      PERMISSIONS.TENANT_PRICES_READ.key,
      PERMISSIONS.TENANT_EXPENSES_READ.key,
      PERMISSIONS.TENANT_EXPENSES_WRITE.key,
      PERMISSIONS.TENANT_CUSTOMERS_READ.key,
      PERMISSIONS.TENANT_WAYBILLS_READ.key,
      PERMISSIONS.TENANT_WAYBILLS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_DIPPINGS_READ.key,
      PERMISSIONS.MOBILE_TENANT_DIPPINGS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_REPORTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_REPORTS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_EXPENSES_READ.key,
      PERMISSIONS.MOBILE_TENANT_EXPENSES_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_ATTENDANTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_ATTENDANTS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_WAYBILLS_READ.key,
      PERMISSIONS.MOBILE_TENANT_WAYBILLS_WRITE.key,
    ] as PermissionKey[],
    isSystem: true,
  },
  {
    name: "Cashier",
    permissions: [
      PERMISSIONS.TENANT_STATIONS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.TENANT_EXPENSES_READ.key,
      PERMISSIONS.TENANT_EXPENSES_WRITE.key,
      PERMISSIONS.TENANT_CUSTOMERS_READ.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_EXPENSES_READ.key,
      PERMISSIONS.MOBILE_TENANT_EXPENSES_WRITE.key,
    ] as PermissionKey[],
    isSystem: true,
  },
  {
    name: "Attendant",
    permissions: [
      PERMISSIONS.TENANT_STATIONS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_READ.key,
      PERMISSIONS.TENANT_SHIFTS_WRITE.key,
      PERMISSIONS.TENANT_DIPPINGS_READ.key,
      PERMISSIONS.TENANT_DIPPINGS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_DIPPINGS_READ.key,
      PERMISSIONS.MOBILE_TENANT_DIPPINGS_WRITE.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_READ.key,
      PERMISSIONS.MOBILE_TENANT_SHIFTS_WRITE.key,
    ] as PermissionKey[],
    isSystem: true,
  },
  {
    name: "Fleet Manager",
    permissions: [
      PERMISSIONS.TENANT_FLEET_READ.key,
      PERMISSIONS.TENANT_FLEET_WRITE.key,
    ] as PermissionKey[],
    isSystem: true,
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
