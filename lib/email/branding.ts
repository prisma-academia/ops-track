import { DEFAULT_PRIMARY_COLOR, parseTenantSettings } from "@/lib/tenant/settings";
import { COMPANY_LOGO, COMPANY_NAME } from "@/lib/branding";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export type EmailBrand = {
  companyName: string;
  logoUrl: string | null;
  primaryColor: string;
};

export const PLATFORM_FAVICON_URL = COMPANY_LOGO.favicon;
export const PLATFORM_ICON_URL = COMPANY_LOGO.icon;

export const PLATFORM_EMAIL_BRAND: EmailBrand = {
  companyName: COMPANY_NAME,
  logoUrl: null,
  primaryColor: DEFAULT_PRIMARY_COLOR,
};

export function resolveLogoUrl(logoKey?: string | null): string | null {
  if (!logoKey) return null;
  if (logoKey.startsWith("http://") || logoKey.startsWith("https://")) return logoKey;
  if (!s3Configured()) return null;
  return publicUrlForKey(logoKey);
}

export function emailBrandFromTenant(tenant: {
  name: string;
  settingsJson?: unknown;
}): EmailBrand {
  const settings = parseTenantSettings(tenant.settingsJson);
  return {
    companyName: tenant.name,
    logoUrl: resolveLogoUrl(settings.logoKey),
    primaryColor: settings.primaryColor,
  };
}

export function resolveEmailBrand(brand?: Partial<EmailBrand> | null): EmailBrand {
  return {
    companyName: brand?.companyName?.trim() || PLATFORM_EMAIL_BRAND.companyName,
    logoUrl: brand?.logoUrl ?? null,
    primaryColor: brand?.primaryColor || DEFAULT_PRIMARY_COLOR,
  };
}

/** White or near-black button label depending on background luminance. */
export function contrastText(hex: string): string {
  const n = hex.replace("#", "");
  if (n.length !== 6) return "#ffffff";
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#0f172a" : "#ffffff";
}

/** Mix `hex` toward white for a soft tinted background. */
export function tint(hex: string, mix = 0.88): string {
  const n = hex.replace("#", "");
  if (n.length !== 6) return "#f8fafc";
  const mixCh = (c: number) => Math.round(c + (255 - c) * mix);
  const r = mixCh(parseInt(n.slice(0, 2), 16));
  const g = mixCh(parseInt(n.slice(2, 4), 16));
  const b = mixCh(parseInt(n.slice(4, 6), 16));
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
