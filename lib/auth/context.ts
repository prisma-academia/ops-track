import { apexHostname } from "@/lib/env";

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "www",
  "app",
  "auth",
  "static",
  "assets",
  "mail",
  "_next",
]);

export type HostContext =
  | { mode: "platform"; slug: null }
  | { mode: "tenant"; slug: string }
  | { mode: "unknown"; slug: string };

export function resolveHost(host: string | null | undefined): HostContext {
  if (!host) return { mode: "platform", slug: null };
  const hostname = host.split(":")[0].toLowerCase();
  const apex = apexHostname().toLowerCase();

  if (hostname === apex) return { mode: "platform", slug: null };
  if (!hostname.endsWith(`.${apex}`)) {
    // Outside of the configured domain — treat as platform (safe default).
    return { mode: "platform", slug: null };
  }
  const sub = hostname.slice(0, -1 * (apex.length + 1));
  if (sub.length === 0) return { mode: "platform", slug: null };
  if (sub.includes(".")) return { mode: "unknown", slug: sub };
  if (RESERVED_SLUGS.has(sub)) return { mode: "platform", slug: null };
  return { mode: "tenant", slug: sub };
}

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export function isValidSlug(slug: string): boolean {
  if (RESERVED_SLUGS.has(slug)) return false;
  return SLUG_REGEX.test(slug);
}
