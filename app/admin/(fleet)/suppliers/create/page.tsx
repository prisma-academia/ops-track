import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CreateSupplierForm } from "./create-form";

export default async function CreateSupplierPage() {
  await requireTenantPage(PERMISSIONS.TENANT_FLEET_SUPPLIERS_WRITE.key);
  return <CreateSupplierForm />;
}
