import { PageHeader, Card } from "@/components/shell";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";

export default async function PlatformSettingsPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_SETTINGS_WRITE.key);
  return (
    <div>
      <PageHeader title="Platform settings" />
      <Card>
        <p className="text-sm text-stone-600">
          Platform-wide settings (feature flags, default tenant template, email templates,
          OTP provider) are managed via environment configuration in this build.
        </p>
      </Card>
    </div>
  );
}
