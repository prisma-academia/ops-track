import { PageHeader, Card } from "@/components/shell";
import { ALL_PLATFORM_PERMISSION_KEYS, PERMISSIONS } from "@/lib/auth/permissions";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { RoleEditor } from "../editor";

export default async function NewPlatformRolePage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_ROLES_WRITE.key);
  return (
    <div>
      <PageHeader title="New platform role" />
      <Card>
        <RoleEditor permissions={ALL_PLATFORM_PERMISSION_KEYS} scope="platform" />
      </Card>
    </div>
  );
}
