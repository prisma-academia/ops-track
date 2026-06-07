import HeroSection from "@/components/sections/hero-section";
import { loadTenantPageContext } from "@/lib/db/page-context";

export default async function TenantLandingPage() {
  const { tenant } = await loadTenantPageContext();
  
  return (
    <div className="min-h-screen bg-stone-50">
      <HeroSection slug={tenant?.slug || "App"} />
    </div>
  );
}
