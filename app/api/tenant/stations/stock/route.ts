import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { getStationStockData } from "@/lib/queries/station-stock";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(undefined, "STATION");
    if (!actor.permissions.has(PERMISSIONS.TENANT_STATIONS_READ.key) && 
        !actor.permissions.has(PERMISSIONS.TENANT_FLEET_READ.key) && 
        !actor.isOwner) {
      throw new Error("You don't have permission to read station stock.");
    }

    const result = await getStationStockData(actor.tenantId);
    return ok(result);
  } catch (e) {
    return handleError(e);
  }
}
