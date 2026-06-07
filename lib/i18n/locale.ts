import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveHost } from "@/lib/auth/context";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { env } from "@/lib/env";

/**
 * Resolve the active locale (PRD §6). Order:
 *   tenant settings.locale → Accept-Language → DEFAULT_LOCALE.
 * Always clamped to SUPPORTED_LOCALES.
 */
export async function resolveLocale(): Promise<string> {
  const supported = env.SUPPORTED_LOCALES;
  const fallback = supported.includes(env.DEFAULT_LOCALE)
    ? env.DEFAULT_LOCALE
    : supported[0] ?? "en";

  const h = await headers();

  // 1. Tenant-configured locale (Tenant is a global model — no tenant context
  //    needed; safe under the Prisma scope guard).
  try {
    const ctx = resolveHost(h.get("host"));
    if (ctx.mode === "tenant") {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: ctx.slug },
        select: { settingsJson: true },
      });
      if (tenant) {
        const loc = parseTenantSettings(tenant.settingsJson).locale;
        if (supported.includes(loc)) return loc;
      }
    }
  } catch {
    // ignore — fall through to header / default
  }

  // 2. Accept-Language
  const accept = h.get("accept-language");
  if (accept) {
    for (const part of accept.split(",")) {
      const tag = part.split(";")[0].trim().toLowerCase();
      const base = tag.split("-")[0];
      if (supported.includes(tag)) return tag;
      if (supported.includes(base)) return base;
    }
  }

  // 3. Default
  return fallback;
}
