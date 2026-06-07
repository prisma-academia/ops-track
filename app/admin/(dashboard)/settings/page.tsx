import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { getTranslations } from "next-intl/server";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";
import { PageHeader, Card } from "@/components/shell";
import { SettingsForm } from "./form";

export default async function TenantSettingsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SETTINGS_READ.key);
  const tenant = await prisma.tenant.findUnique({
    where: { id: actor.tenantId },
  });
  if (!tenant) notFound();

  const settings = parseTenantSettings(tenant.settingsJson);
  const logoUrl =
    settings.logoKey && s3Configured() ? publicUrlForKey(settings.logoKey) : null;
  const t = await getTranslations("settings");

  return (
    <div>
      <PageHeader title={t("title")} />
      <Card>
        <SettingsForm
          initial={{ name: tenant.name, settings, logoUrl }}
          storageEnabled={s3Configured()}
        />
      </Card>
    </div>
  );
}
