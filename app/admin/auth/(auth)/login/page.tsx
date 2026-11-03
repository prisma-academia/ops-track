import { Mail } from "lucide-react";
import { AdminLoginForm } from "./form";
import { ThemeToggle } from "./theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadTenantPageContext } from "@/lib/db/page-context";
import { AuthLayoutWrapper } from "@/components/auth-layout-wrapper";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import { UnauthorizedToast } from "@/components/unauthorized-toast";
import { COMPANY_LOGO, COMPANY_NAME, TENANT_HERO_FALLBACK_IMAGE } from "@/lib/branding";
import { env, isProd } from "@/lib/env";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function LoginBrandPanel({
  backgroundUrl,
  logoUrl,
  name,
  email,
}: {
  backgroundUrl: string | null;
  logoUrl: string | null;
  name: string;
  email: string | null;
}) {
  return (
    <div className="h-64 p-2 md:h-full md:min-h-[32rem]">
      <div className="relative h-full overflow-hidden rounded-2xl">
        <img
          src={backgroundUrl || TENANT_HERO_FALLBACK_IMAGE}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-background/20 dark:bg-background/30" />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-background via-background/80 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-5">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-background shadow-md">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="size-full object-cover" />
            ) : name === COMPANY_NAME ? (
              <img src={COMPANY_LOGO.icon} alt="" className="size-9 object-contain" />
            ) : (
              <span className="text-sm font-semibold text-foreground">{initials(name)}</span>
            )}
          </div>
          <div className="min-w-0 pb-0.5">
            <p className="truncate text-base font-semibold text-foreground">{name}</p>
            {email ? (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate">{email}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function AdminLoginPage() {
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
  const displayName = tenant?.name || COMPANY_NAME;
  const landingHref = `${isProd ? "https" : "http"}://${env.APP_DOMAIN}/`;

  return (
    <AuthLayoutWrapper hideAside>
      <UnauthorizedToast />
      <Card className="w-full max-w-4xl overflow-hidden p-0 gap-0">
        <div className="grid md:grid-cols-[minmax(16rem,0.9fr)_minmax(0,1.1fr)]">
          <LoginBrandPanel
            backgroundUrl={backgroundUrl}
            logoUrl={logoUrl}
            name={displayName}
            email={tenant?.companyEmail ?? null}
          />
          <div className="relative flex flex-col justify-center gap-6 px-6 py-8 sm:px-12 sm:py-12">
            <Badge
              variant="outline"
              className="absolute top-3 left-3 h-7 max-w-[11rem] gap-1.5 rounded-full bg-background px-1 pr-2 text-xs font-medium sm:top-4 sm:left-4"
            >
              <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="size-full object-cover" />
                ) : displayName === COMPANY_NAME ? (
                  <img src={COMPANY_LOGO.icon} alt="" className="size-3.5 object-contain" />
                ) : (
                  <span className="text-[10px] font-semibold leading-none">{initials(displayName)}</span>
                )}
              </span>
              <span className="truncate">{displayName}</span>
            </Badge>
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
              <ThemeToggle />
            </div>
            <CardHeader className="text-center gap-6 p-0">
              <div className="flex flex-col gap-1">
                <CardTitle className="text-2xl font-medium text-card-foreground">
                  {displayName}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground font-normal">
                  Login to your account now
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col gap-6">
              <AdminLoginForm />
            </CardContent>
          </div>
        </div>
      </Card>
      <a
        href={landingHref}
        className="mt-8 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Powered by <span className="font-semibold text-foreground">{COMPANY_NAME}</span>
      </a>
    </AuthLayoutWrapper>
  );
}

