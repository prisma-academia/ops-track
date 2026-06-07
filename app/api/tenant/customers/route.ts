import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  outstandingBalance: z.coerce.number().default(0),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CUSTOMERS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);

    const rows = await prisma.customer.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CUSTOMERS_WRITE.key);
    const body = CreateCustomerSchema.parse(await request.json());
    const meta = requestMeta(request);

    const customer = await prisma.customer.create({
      data: {
        tenantId: actor.tenantId,
        name: body.name,
        outstandingBalance: body.outstandingBalance,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "customer.create",
      tenantId: actor.tenantId,
      targetType: "Customer",
      targetId: customer.id,
      after: { name: customer.name, outstandingBalance: customer.outstandingBalance } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ customer });
  } catch (e) {
    return handleError(e);
  }
}
