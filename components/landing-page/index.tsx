import HeroSection, { type LandingStats } from "@/components/landing-page/hero";
import Navbar from "@/components/landing-page/navbar";
import { NavLinkItem } from "@/components/landing-page/navbar";
import { DownloadAppSection } from "@/components/landing-page/download-app";
import Feature01 from "@/components/landing-page/features";
import Testimonial01 from "@/components/landing-page/testimonials";
import Footer from "@/components/landing-page/footer";
import type { BrandList } from "@/components/landing-page/testimonials/brand-slider";

const Hero02Page = ({
  stats,
  partnerLogos,
}: {
  stats: LandingStats;
  partnerLogos: BrandList[];
}) => {
  const navData: NavLinkItem[] = [
    { name: "Home", href: "/", isActive: true },
    // { name: "Platform sign in", href: "/auth/login", isActive: false },
    // { name: "Go to workspace", href: "/auth/login", isActive: false },
    { name: "Register", href: "/auth/register", isActive: false },
  ];
  return (
    <>
      <Navbar navData={navData} />
      <main className="-mt-20 overflow-x-clip">
        <HeroSection stats={stats} />
        <Feature01 />
        <Testimonial01 partnerLogos={partnerLogos} />
        <DownloadAppSection />
      </main>
      <Footer />
    </>
  );
};

export default Hero02Page;
