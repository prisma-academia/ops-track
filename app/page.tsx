import LandingPage from "@/components/landing-page";
import { prisma } from "@/lib/db/client";
import { getLandingPartnerLogos } from "@/lib/landing/partner-logos";

export default async function Root() {
  const [trucks, stations, transports, tanks, partnerLogos] = await Promise.all([
    prisma.truck.count(),
    prisma.station.count(),
    prisma.transport.count(),
    prisma.tank.count(),
    getLandingPartnerLogos(),
  ]);

  return (
    <LandingPage
      stats={{ trucks, stations, transports, tanks }}
      partnerLogos={partnerLogos}
    />
  );
}
