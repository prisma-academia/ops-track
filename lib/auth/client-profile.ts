export function clientProfileIncomplete(profileJson: unknown): boolean {
  const o = profileJson as Record<string, unknown> | null | undefined;
  const name = o?.name;
  return typeof name !== "string" || name.trim().length === 0;
}
