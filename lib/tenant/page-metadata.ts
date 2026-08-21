import type { Metadata } from "next";
import { loadTenantPageContext } from "@/lib/db/page-context";
import {
  emailBrandFromTenant,
  PLATFORM_EMAIL_BRAND,
  type EmailBrand,
} from "@/lib/email/branding";

export async function resolveHostBrand(): Promise<EmailBrand> {
  const { tenant } = await loadTenantPageContext();
  return tenant ? emailBrandFromTenant(tenant) : PLATFORM_EMAIL_BRAND;
}

/** Browser tab title + favicon for the current host (tenant subdomain or platform). */
export async function resolveHostMetadata(): Promise<Metadata> {
  const brand = await resolveHostBrand();
  const metadata: Metadata = {
    title: {
      default: brand.companyName,
      template: `%s | ${brand.companyName}`,
    },
    applicationName: brand.companyName,
  };

  if (brand.logoUrl) {
    metadata.icons = {
      icon: [{ url: brand.logoUrl }],
      apple: [{ url: brand.logoUrl }],
    };
  }

  return metadata;
}
