import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import { PageHeader, Card } from "@/components/shell";
import { SettingsForm } from "../form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TenantSettingsEditPage() {
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

  return (
    <div className="container px-0 max-w-5xl mx-auto pb-10">
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Edit Settings" />
        <Link
          href="/admin/fleet/settings"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "gap-2"
          )}
        >
          <ArrowLeft className="size-4" />
          Back to Profile
        </Link>
      </div>
      <Card>
        <SettingsForm
          initial={{ name: tenant.name, settings, logoUrl, backgroundUrl }}
          storageEnabled={s3Configured()}
        />
      </Card>
    </div>
  );
}
