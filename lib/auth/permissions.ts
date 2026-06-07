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
  TENANT_OPERATIONS_READ: { key: "tenant.operations:read", module: "tenant.operations", description: "View daily sales and stock reports" },
  TENANT_OPERATIONS_WRITE: { key: "tenant.operations:write", module: "tenant.operations", description: "Record daily sales logs, dippings, and stock reports" },
  TENANT_TICKETS_READ: { key: "tenant.tickets:read", module: "tenant.tickets", description: "View station tickets" },
  TENANT_TICKETS_WRITE: { key: "tenant.tickets:write", module: "tenant.tickets", description: "Create and resolve tickets" },
  TENANT_TICKETS_APPROVE: { key: "tenant.tickets:approve", module: "tenant.tickets", description: "Approve or reject pending tickets" },
  TENANT_CUSTOMERS_READ: { key: "tenant.customers:read", module: "tenant.customers", description: "View customer accounts" },
  TENANT_CUSTOMERS_WRITE: { key: "tenant.customers:write", module: "tenant.customers", description: "Manage customer accounts and balances" },
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]["key"];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const ALL_PLATFORM_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS
  .filter((p) => p.key.startsWith("platform."))
  .map((p) => p.key as PermissionKey);

export const ALL_TENANT_PERMISSION_KEYS: PermissionKey[] = ALL_PERMISSIONS
  .filter((p) => p.key.startsWith("tenant."))
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
    name: "Staff",
    permissions: [
      PERMISSIONS.TENANT_USERS_READ.key,
      PERMISSIONS.TENANT_CLIENTS_READ.key,
      PERMISSIONS.TENANT_CLIENTS_WRITE.key,
      PERMISSIONS.TENANT_TEMPLATES_READ.key,
      PERMISSIONS.TENANT_STATIONS_READ.key,
      PERMISSIONS.TENANT_OPERATIONS_READ.key,
      PERMISSIONS.TENANT_OPERATIONS_WRITE.key,
      PERMISSIONS.TENANT_TICKETS_READ.key,
      PERMISSIONS.TENANT_TICKETS_WRITE.key,
    ] as PermissionKey[],
    isSystem: true,
  },
  {
    name: "Read-only",
    permissions: ALL_TENANT_PERMISSION_KEYS.filter((k) => k.endsWith(":read")) as PermissionKey[],
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
