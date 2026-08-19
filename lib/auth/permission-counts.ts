export function countPermissionActions(permissions: string[]) {
  return {
    read: permissions.filter((p) => p.endsWith(":read")).length,
    write: permissions.filter((p) => p.endsWith(":write")).length,
    approve: permissions.filter((p) => p.endsWith(":approve")).length,
  };
}

export function permissionsMatch(userPerms: string[], rolePerms: string[]) {
  if (userPerms.length !== rolePerms.length) return false;
  const set = new Set(userPerms);
  return rolePerms.every((p) => set.has(p));
}
