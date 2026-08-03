import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateTransporterSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  registrationNumber: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),

  contactPosition: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  kycDocuments: z.any().optional(),
  status: z.enum(["ACTIVE", "MAINTENANCE", "OFFLINE", "ISSUE"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);

    const transporter = await prisma.transporter.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: {
        trucks: { orderBy: { createdAt: "desc" } },
        drivers: { orderBy: { createdAt: "desc" } },
        _count: { select: { transports: true } },
      },
    });

    if (!transporter) throw new DomainError(404, "not_found", "Transporter not found.");
    return ok({ transporter });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = UpdateTransporterSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.transporter.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) throw new DomainError(404, "not_found", "Transporter not found.");

    const transporter = await prisma.transporter.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.email !== undefined && { email: body.email }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.registrationNumber !== undefined && { registrationNumber: body.registrationNumber }),
        ...(body.businessType !== undefined && { businessType: body.businessType }),
        ...(body.contactPerson !== undefined && { contactPerson: body.contactPerson }),
        ...(body.contactPhone !== undefined && { contactPhone: body.contactPhone }),
        ...(body.contactPosition !== undefined && { contactPosition: body.contactPosition }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.lga !== undefined && { lga: body.lga }),
        ...(body.ward !== undefined && { ward: body.ward }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.kycDocuments !== undefined && { kycDocuments: body.kycDocuments }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transporter.update",
      tenantId: actor.tenantId,
      targetType: "Transporter",
      targetId: transporter.id,
      before: { name: existing.name } as object,
      after: { name: transporter.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transporter });
  } catch (e) {
    return handleError(e);
  }
}
