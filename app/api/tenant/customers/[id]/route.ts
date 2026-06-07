import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateCustomerSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  outstandingBalance: z.coerce.number().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CUSTOMERS_READ.key);

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer || customer.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Customer not found.");
    }

    return ok(customer);
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CUSTOMERS_WRITE.key);
    const body = UpdateCustomerSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Customer not found.");
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        outstandingBalance: body.outstandingBalance ?? undefined,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "customer.update",
      tenantId: actor.tenantId,
      targetType: "Customer",
      targetId: customer.id,
      before: { name: existing.name, outstandingBalance: existing.outstandingBalance } as object,
      after: { name: customer.name, outstandingBalance: customer.outstandingBalance } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ customer });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CUSTOMERS_WRITE.key);
    const meta = requestMeta(request);

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer || customer.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Customer not found.");
    }

    await prisma.customer.delete({ where: { id } });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "customer.delete",
      tenantId: actor.tenantId,
      targetType: "Customer",
      targetId: id,
      before: { name: customer.name, outstandingBalance: customer.outstandingBalance } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
