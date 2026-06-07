import { PageHeader, Card } from "@/components/shell";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateTenantForm } from "../create-form";

export default async function NewTenantPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
  return (
    <div>
      <PageHeader title="New tenant" />
      <Card>
        <CreateTenantForm />
      </Card>
    </div>
  );
}
