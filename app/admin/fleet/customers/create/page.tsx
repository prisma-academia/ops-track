import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateCustomerForm } from "./create-form"; 

export default async function NewCustomerPage() {
  await requireTenantPage(PERMISSIONS.TENANT_CUSTOMERS_WRITE.key);

  return (
    <div className="space-y-6">
      <CreateCustomerForm />
    </div>
  );
}
