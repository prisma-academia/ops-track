import type { Metadata } from "next";
import { loadTenantPageContext } from "@/lib/db/page-context";
import {
  emailBrandFromTenant,
  PLATFORM_EMAIL_BRAND,
  PLATFORM_FAVICON_URL,
  type EmailBrand,
} from "@/lib/email/branding";

export async function resolveHostBrand(): Promise<EmailBrand> {
  const { tenant } = await loadTenantPageContext();
  return tenant ? emailBrandFromTenant(tenant) : PLATFORM_EMAIL_BRAND;
}

/** Browser tab title + favicon for the current host (tenant subdomain or platform). */
export async function resolveHostMetadata(): Promise<Metadata> {
  const brand = await resolveHostBrand();
  const iconUrl = brand.logoUrl || PLATFORM_FAVICON_URL;
  const icon = brand.logoUrl
    ? { url: iconUrl }
    : { url: iconUrl, type: "image/png" as const };

  return {
    title: {
      default: brand.companyName,
      template: `%s | ${brand.companyName}`,
    },
    applicationName: brand.companyName,
    icons: {
      icon: [icon],
      apple: [{ url: iconUrl }],
    },
  };
}
