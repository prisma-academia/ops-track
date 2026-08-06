import HeroSection from "@/components/sections/hero-section";
import FooterSection from "@/components/sections/footer";
import { loadTenantPageContext } from "@/lib/db/page-context";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

export default async function TenantLandingPage() {
  const { tenant } = await loadTenantPageContext();
  const settings = tenant ? parseTenantSettings(tenant.settingsJson) : null;
  const logoUrl =
    settings?.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings?.logoKey && s3Configured()
      ? publicUrlForKey(settings.logoKey)
      : null;
      
  const backgroundUrl =
    settings?.backgroundKey?.startsWith("http")
      ? settings.backgroundKey
      : settings?.backgroundKey && s3Configured()
      ? publicUrlForKey(settings.backgroundKey)
      : null;
  
  return (
    <div className="min-h-screen bg-stone-50">
      <HeroSection slug={tenant?.slug || "App"} name={tenant?.name || "App"} logoUrl={logoUrl} backgroundUrl={backgroundUrl} />
      <FooterSection slug={tenant?.slug || "App"} name={tenant?.name || "App"} logoUrl={logoUrl} />
    </div>
  );
}
