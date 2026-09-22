import { PageHeader } from "@/components/shell";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateTenantForm } from "../create-form";

export default async function NewTenantPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Register New Tenant"
        backHref="/tenants"
      />
      <CreateTenantForm />
    </div>
  );
}
