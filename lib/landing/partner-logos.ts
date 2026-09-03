import { prisma } from "@/lib/db/client";
import { resolveLogoUrl } from "@/lib/email/branding";
import { parseTenantSettings } from "@/lib/tenant/settings";

export type PartnerLogo = {
  name: string;
  image: string;
  lightimg?: string;
};

const FALLBACK_PARTNER_LOGOS: PartnerLogo[] = [
  {
    name: "ASA Oil Nig Limited",
    image: "/assets/icons/asa-oil-image.jpeg",
    lightimg: "/assets/icons/asa-oil-logo.png",
  },
];

export async function getLandingPartnerLogos(): Promise<PartnerLogo[]> {
  const [tenants, stationOrgs] = await Promise.all([
    prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, settingsJson: true },
      take: 40,
    }),
    prisma.organization.findMany({
      where: {
        isActive: true,
        logoKey: { not: null },
        stations: { some: {} },
      },
      select: { id: true, name: true, logoKey: true },
      take: 40,
    }),
  ]);

  const logos: PartnerLogo[] = [];
  const seen = new Set<string>();

  for (const tenant of tenants) {
    const image = resolveLogoUrl(parseTenantSettings(tenant.settingsJson).logoKey);
    if (!image || seen.has(image)) continue;
    seen.add(image);
    logos.push({ name: tenant.name, image });
  }

  for (const org of stationOrgs) {
    const image = resolveLogoUrl(org.logoKey);
    if (!image || seen.has(image)) continue;
    seen.add(image);
    logos.push({ name: org.name, image });
  }

  return logos.length > 0 ? logos : FALLBACK_PARTNER_LOGOS;
}
