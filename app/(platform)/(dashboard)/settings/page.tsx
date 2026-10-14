import { PageHeader, Card } from "@/components/shell";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DatabaseBackupButton } from "@/components/platform/database-backup-button";

export default async function PlatformSettingsPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_SETTINGS_WRITE.key);
  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" />
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Database backup</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Download a full PostgreSQL SQL dump. Requires{" "}
            <code className="text-xs">pg_dump</code> on the application server and access to the
            database host.
          </p>
        </div>
        <DatabaseBackupButton />
      </Card>
      <Card className="p-6">
        <p className="text-sm text-stone-600">
          Other platform-wide settings (feature flags, default tenant template, email templates,
          OTP provider) are managed via environment configuration in this build.
        </p>
      </Card>
    </div>
  );
}
