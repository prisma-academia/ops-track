import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { normalizeSupplierName } from "@/lib/fleet/suppliers";
import { mapSupplierListRow, supplierMetricsOrderInclude } from "@/lib/fleet/supplier-list";

const UpdateSupplierSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  supplierType: z.enum(["LOCAL", "DEPOT"]).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  lga: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  contactPosition: z.string().optional().or(z.literal("")),
  outstandingBalance: z.coerce.number().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SUPPLIERS_READ.key);

    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: supplierMetricsOrderInclude,
    });

    if (!supplier) {
      throw new DomainError(404, "not_found", "Supplier not found.");
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { settingsJson: true },
    });

    return ok(await mapSupplierListRow(supplier, actor.tenantId, tenant?.settingsJson));
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SUPPLIERS_WRITE.key);
    const body = UpdateSupplierSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.supplier.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) {
      throw new DomainError(404, "not_found", "Supplier not found.");
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: body.name ? normalizeSupplierName(body.name) : undefined,
        supplierType: body.supplierType !== undefined ? body.supplierType : undefined,
        email: body.email !== undefined ? body.email || null : undefined,
        phone: body.phone !== undefined ? body.phone || null : undefined,
        address: body.address !== undefined ? body.address || null : undefined,
        state: body.state !== undefined ? body.state || null : undefined,
        lga: body.lga !== undefined ? body.lga || null : undefined,
        contactPerson:
          body.contactPerson !== undefined ? body.contactPerson || null : undefined,
        contactPhone:
          body.contactPhone !== undefined ? body.contactPhone || null : undefined,
        contactPosition:
          body.contactPosition !== undefined ? body.contactPosition || null : undefined,
        outstandingBalance: body.outstandingBalance ?? undefined,
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "supplier.update",
      tenantId: actor.tenantId,
      targetType: "Supplier",
      targetId: supplier.id,
      before: { name: existing.name } as object,
      after: { name: supplier.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ supplier });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SUPPLIERS_WRITE.key);
    const meta = requestMeta(request);

    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId: actor.tenantId },
    });
    if (!supplier) {
      throw new DomainError(404, "not_found", "Supplier not found.");
    }

    await prisma.supplier.delete({ where: { id } });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "supplier.delete",
      tenantId: actor.tenantId,
      targetType: "Supplier",
      targetId: id,
      before: { name: supplier.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
