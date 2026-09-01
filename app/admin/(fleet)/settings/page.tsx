import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db/client";
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

function textOrFallback(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "Not provided";
}

function InfoField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

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

  const location = [tenant.city, tenant.region, tenant.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="w-full pb-10">
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
              {location || "No location set"}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About Company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground/80">Status:</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full text-xs font-medium">
                  <CheckCircle2 className="size-3" />
                  {tenant.status}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Mail className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground/80">Email:</span>
                <span className="text-muted-foreground break-all">{textOrFallback(tenant.companyEmail)}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Phone className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground/80">Phone:</span>
                <span className="text-muted-foreground">{textOrFallback(tenant.companyPhone)}</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <Globe className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground/80">Website:</span>
                {tenant.website ? (
                  <a href={tenant.website} target="_blank" rel="noreferrer" className="text-primary hover:underline break-all">
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
        
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Address Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField label="Address Line 1">{textOrFallback(tenant.addressLine1)}</InfoField>
                <InfoField label="Address Line 2">{textOrFallback(tenant.addressLine2)}</InfoField>
                <InfoField label="City">{textOrFallback(tenant.city)}</InfoField>
                <InfoField label="State / Region">{textOrFallback(tenant.region)}</InfoField>
                <InfoField label="Postal Code">{textOrFallback(tenant.postalCode)}</InfoField>
                <InfoField label="Country">{textOrFallback(tenant.country)}</InfoField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <InfoField label="Primary Color">
                  <div className="flex items-center gap-2">
                    <div
                      className="size-6 rounded border shadow-sm"
                      style={{ backgroundColor: settings.primaryColor }}
                    />
                    <span className="font-mono">{settings.primaryColor}</span>
                  </div>
                </InfoField>
                <InfoField label="Default Currency">{settings.currency}</InfoField>
                <InfoField label="Timezone">{settings.timezone}</InfoField>
                <InfoField label="Locale">{settings.locale}</InfoField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoField label="Variance Threshold">
                  {settings.varianceThreshold.toLocaleString()} L
                </InfoField>
                <InfoField label="Block on unresolved variance">
                  {settings.blockOnUnresolvedVariance ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full text-xs font-medium">
                      Enabled
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Disabled</span>
                  )}
                </InfoField>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Alerts trigger above this volume difference. When blocking is enabled, new dipping sessions are prevented if there is an unresolved variance ticket.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
