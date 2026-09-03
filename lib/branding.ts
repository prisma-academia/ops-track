/** Platform and vendor brand assets. Safe to import from client components. */

export const COMPANY_NAME = "OpsTrack";

export const COMPANY_LOGO = {
  /** Circular mark — compact spots, sidebars, fallbacks */
  icon: "/assets/images/opstrack-icon.png",
  /** Wordmark lockup for dark backgrounds */
  banner: "/assets/images/ops-track-banner-icon.png",
  bannerImage: "/assets/images/ops-track-banner-image.png",
  favicon: "/assets/images/favicon.png",
} as const;

export const POWERED_BY_NAME = "PrismaForge";

/** Set to `/assets/images/prismaforge-logo.png` (or similar) when the mark is ready. */
export const POWERED_BY_LOGO_URL: string | null = null;
