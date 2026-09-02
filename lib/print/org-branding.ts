import { resolveLogoUrl } from "@/lib/email/branding";

export const ORGANIZATION_BRAND_SELECT = {
  name: true,
  slug: true,
  logoKey: true,
  companyEmail: true,
  companyPhone: true,
  address: true,
  state: true,
  lga: true,
} as const;

export type OrganizationBrand = {
  name: string;
  slug: string | null;
  logoKey: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  address: string | null;
  state: string | null;
  lga: string | null;
};

export function printCompanyFromOrganization(org: OrganizationBrand) {
  return {
    name: org.name,
    slug: org.slug,
    logoUrl: resolveLogoUrl(org.logoKey),
    email: org.companyEmail,
    phone: org.companyPhone,
    address: [org.address, org.lga, org.state].filter(Boolean).join(", ") || null,
  };
}
