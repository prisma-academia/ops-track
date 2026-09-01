import { prisma } from "@/lib/db/client";
import { DomainError } from "@/lib/api/errors";
import type { TenantActor } from "@/lib/auth/permissions";
import { resolveActiveOrgIdFromCookie } from "@/lib/auth/org-scope";

export async function resolveStationBankAccountOrgId(
  actor: TenantActor,
  requestedOrgId?: string | null,
): Promise<string> {
  if (actor.organizationId) {
    if (requestedOrgId && requestedOrgId !== actor.organizationId) {
      throw new DomainError(403, "forbidden", "You can only manage bank accounts for your own organization.");
    }
    return actor.organizationId;
  }

  if (requestedOrgId) {
    const org = await prisma.organization.findFirst({
      where: { id: requestedOrgId, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!org) {
      throw new DomainError(400, "invalid_input", "Organization not found.");
    }
    return org.id;
  }

  const cookieOrgId = await resolveActiveOrgIdFromCookie(actor);
  if (cookieOrgId) return cookieOrgId;

  const internal = await prisma.organization.findFirst({
    where: { tenantId: actor.tenantId, type: "INTERNAL" },
    select: { id: true },
  });
  if (!internal) {
    throw new DomainError(400, "invalid_input", "No organization is available to own this bank account.");
  }
  return internal.id;
}

export function stationAccountListFilter(actor: TenantActor, orgId: string | null) {
  if (actor.organizationId) {
    return { organizationId: actor.organizationId, scope: "STATION" as const };
  }
  if (orgId) {
    return { organizationId: orgId, scope: "STATION" as const };
  }
  return { scope: "STATION" as const };
}
