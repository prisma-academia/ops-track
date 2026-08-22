import { PERMISSIONS, type PermissionKey } from "@/lib/auth/permissions";

export function notificationPermission(
  module: "STATION" | "FLEET",
  write: boolean
): PermissionKey {
  if (module === "FLEET") {
    return write
      ? PERMISSIONS.TENANT_FLEET_NOTIFICATIONS_WRITE.key
      : PERMISSIONS.TENANT_FLEET_NOTIFICATIONS_READ.key;
  }
  return write
    ? PERMISSIONS.TENANT_NOTIFICATIONS_WRITE.key
    : PERMISSIONS.TENANT_NOTIFICATIONS_READ.key;
}
