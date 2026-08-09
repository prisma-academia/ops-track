import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { assertOrgAccess } from "@/lib/auth/org-scope";

const UpdateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["INTERNAL", "EXTERNAL"]).optional(),
  companyEmail: z.string().email().optional().or(z.literal("")).nullable(),
  companyPhone: z.string().optional().or(z.literal("")).nullable(),
  ownerId: z.string().optional().or(z.literal("")).nullable(),
  logoKey: z.string().optional().or(z.literal("")).nullable(),
  address: z.string().optional().or(z.literal("")).nullable(),
  state: z.string().optional().or(z.literal("")).nullable(),
  lga: z.string().optional().or(z.literal("")).nullable(),
  contactPerson: z.string().optional().or(z.literal("")).nullable(),
  contactPhone: z.string().optional().or(z.literal("")).nullable(),
  contactPosition: z.string().optional().or(z.literal("")).nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_ORGS_READ.key);
    const { id } = await params;

    const org = await prisma.organization.findUnique({
      where: { id, tenantId: actor.tenantId },
      include: {
        _count: {
          select: { stations: true, users: true }
        }
      }
    });

    if (!org) {
      throw new DomainError(404, "not_found", "Organization not found");
    }

    // Ensure actor is allowed to see this org
    assertOrgAccess(actor, org.id);

    return ok({ organization: org });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_ORGS_WRITE.key);
    const { id } = await params;
    
    // Only fleet-wide admins can edit organizations
    if (actor.organizationId) {
      throw new DomainError(403, "forbidden", "Only fleet-wide admins can modify organizations.");
    }

    const body = UpdateOrgSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.organization.findUnique({
      where: { id, tenantId: actor.tenantId },
    });

    if (!existing) {
      throw new DomainError(404, "not_found", "Organization not found");
    }

    const org = await prisma.organization.update({
      where: { id },
      data: {
        name: body.name,
        type: body.type,
        companyEmail: body.companyEmail,
        companyPhone: body.companyPhone,
        ownerId: body.ownerId,
        logoKey: body.logoKey,
        address: body.address,
        state: body.state,
        lga: body.lga,
        contactPerson: body.contactPerson,
        contactPhone: body.contactPhone,
        contactPosition: body.contactPosition,
        isActive: body.isActive,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "organization.update",
      tenantId: actor.tenantId,
      targetType: "Organization",
      targetId: org.id,
      after: body,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ organization: org });
  } catch (e) {
    return handleError(e);
  }
}
