import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateDepotForm } from "./create-form";

export default async function CreateDepotPage() {
  await requireTenantPage(PERMISSIONS.TENANT_FLEET_WRITE.key);
  return <CreateDepotForm />;
}
