import { permissionsMatch } from "./permission-counts";

export type RoleTemplateLite = {
  name: string;
  permissions: string[];
  module?: string;
};

export function resolveUserRole(
  user: {
    isOwner: boolean;
    stationPermissions?: string[];
    fleetPermissions?: string[];
  },
  roleTemplates: RoleTemplateLite[] = [],
  moduleContext?: "STATION" | "FLEET" | null
): string {
  if (user.isOwner) return "Owner";

  const perms =
    moduleContext === "STATION"
      ? (user.stationPermissions ?? [])
      : moduleContext === "FLEET"
      ? (user.fleetPermissions ?? [])
      : [...(user.stationPermissions ?? []), ...(user.fleetPermissions ?? [])];

  if (!perms || perms.length === 0) return "User";

  const relevantTemplates = moduleContext
    ? roleTemplates.filter((t) => t.module === moduleContext)
    : roleTemplates;

  // 1. Exact match with a template
  const exact = relevantTemplates.find((t) => permissionsMatch(perms, t.permissions));
  if (exact) return exact.name;

  // 2. Subset match (template whose permissions are all possessed by the user)
  const subsetMatch = relevantTemplates
    .filter((t) => t.permissions.length > 0 && t.permissions.every((p) => perms.includes(p)))
    .sort((a, b) => b.permissions.length - a.permissions.length)[0];
  if (subsetMatch) return subsetMatch.name;

  // 3. Fallback based on permission level
  const writeCount = perms.filter((p) => p.endsWith(":write") || p.endsWith(":approve")).length;
  if (writeCount >= 5) return "Admin";
  if (writeCount > 0) return "Staff";

  return "User";
}
