export function displayName(u: { firstName?: string | null; lastName?: string | null; email?: string | null }): string {
  const parts = [u.firstName, u.lastName].filter((x): x is string => !!x);
  if (parts.length > 0) return parts.join(" ");
  return u.email ?? "";
}
