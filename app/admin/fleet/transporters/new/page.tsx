import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateTransporterForm } from "./transporter-form"; 

export default async function NewTransporterPage() {
  await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);

  return (
    <div className="space-y-6">
      <CreateTransporterForm />
    </div>
  );
}
