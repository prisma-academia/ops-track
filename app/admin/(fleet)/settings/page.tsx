import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getTranslations } from "next-intl/server";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import Link from "next/link";
import { UserPen, Building2, MapPin, Globe, Phone, Mail, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TenantSettingsProfilePage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SETTINGS_READ.key);
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
  });
  if (!tenant) notFound();

  const settings = parseTenantSettings(tenant.settingsJson);
  
  const logoUrl =
    settings.logoKey?.startsWith("http")
      ? settings.logoKey
      : settings.logoKey && s3Configured()
      ? publicUrlForKey(settings.logoKey)
      : null;

  const backgroundUrl =
    settings.backgroundKey?.startsWith("http")
      ? settings.backgroundKey
      : settings.backgroundKey && s3Configured()
      ? publicUrlForKey(settings.backgroundKey)
      : null;

  const signatureUrl =
    settings.signatureKey?.startsWith("http")
      ? settings.signatureKey
      : settings.signatureKey && s3Configured()
      ? publicUrlForKey(settings.signatureKey)
      : null;

  const t = await getTranslations("settings");

  return (
    <div className="container px-0 max-w-5xl mx-auto pb-10">
      <section className="bg-background border rounded-xl overflow-hidden mb-6 shadow-sm">
        <AspectRatio ratio={5 / 1} className="bg-stone-200 dark:bg-stone-800">
          {backgroundUrl ? (
            <img
              src={backgroundUrl}
              className="h-full w-full object-cover"
              alt="Profile Background"
            />
          ) : (
            <div className="h-full w-full bg-slate-800" />
          )}
        </AspectRatio>
        <div className="relative w-full flex flex-col items-center gap-4 p-6 md:flex-row md:items-end md:-mt-12">
          <Avatar className="size-32 border-4 border-background shadow-md">
            <AvatarImage
              src={logoUrl || ""}
              alt={tenant.name}
              className="object-cover bg-white"
            />
            <AvatarFallback className="text-3xl bg-primary/10 text-primary">
              {tenant.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-start md:pb-2">
            <h1 className="text-2xl font-bold line-clamp-1">{tenant.name}</h1>
            <p className="text-muted-foreground line-clamp-1 flex items-center justify-center md:justify-start gap-1">
              <MapPin className="size-3.5" />
              {tenant.city ? `${tenant.city}, ` : ""}
              {tenant.country || "No location set"}
            </p>
          </div>
          
          <div className="md:pb-2">
            <Link
              href="/admin/settings/edit"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "gap-2"
              )}
            >
              <UserPen className="size-4" />
              Edit Settings
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About Company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="size-4 text-muted-foreground" />
                <span className="font-medium text-foreground/80">Status:</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full text-xs font-medium">
                  <CheckCircle2 className="size-3" />
                  {tenant.status}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                <span className="font-medium text-foreground/80">Email:</span>
                <span className="text-muted-foreground">{tenant.companyEmail || "Not provided"}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                <span className="font-medium text-foreground/80">Phone:</span>
                <span className="text-muted-foreground">{tenant.companyPhone || "Not provided"}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Globe className="size-4 text-muted-foreground" />
                <span className="font-medium text-foreground/80">Website:</span>
                {tenant.website ? (
                  <a href={tenant.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    {tenant.website}
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Documents & Signatures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <span className="font-medium text-sm text-foreground/80">Authorized Signature</span>
                  {signatureUrl ? (
                    <div className="mt-2 h-20 w-48 rounded-md border-2 border-dashed bg-stone-50 dark:bg-stone-900 flex items-center justify-center p-1">
                      <img
                        alt="Authorized Signature"
                        src={signatureUrl}
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">Not provided</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Primary Color</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div 
                      className="size-6 rounded border shadow-sm" 
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                    <span className="text-sm font-mono">{settings.primaryColor}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Default Currency</p>
                  <p className="mt-1 text-sm">{settings.currency}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Timezone</p>
                  <p className="mt-1 text-sm">{settings.timezone}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Locale</p>
                  <p className="mt-1 text-sm">{settings.locale}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-3">Enabled Modules</p>
                <div className="flex flex-wrap gap-2">
                  {settings.enabledModules.map(mod => (
                    <span key={mod} className="bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-md font-medium uppercase">
                      {mod}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
