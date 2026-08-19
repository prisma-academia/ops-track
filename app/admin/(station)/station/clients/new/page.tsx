import { PageHeader, Card } from "@/components/shell";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateClientForm } from "./create-form";

export default async function NewClientPage() {
  await requireTenantPage(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
  return (
    <div>
      <PageHeader title="New client" />
      <Card>
        <CreateClientForm />
      </Card>
    </div>
  );
}
