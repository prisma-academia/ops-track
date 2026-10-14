const BANK_LOGO_CDN = "https://cdn.jsdelivr.net/gh/supermx1/nigerian-banks-api@main/logos";

/** Local mark used when a Paystack slug is missing or the CDN logo fails to load. */
export const BANK_LOGO_FALLBACK = "/banks/fallback.svg";

/**
 * Logo URL for a Paystack bank slug.
 * Example: `guaranty-trust-bank` → CDN png. Missing or unsafe slugs use the local fallback.
 */
export function getBankLogoUrl(slug?: string | null): string {
  const clean = slug?.trim().toLowerCase() ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(clean)) {
    return BANK_LOGO_FALLBACK;
  }
  return `${BANK_LOGO_CDN}/${clean}.png`;
}
