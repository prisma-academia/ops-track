import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";

const CreateCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  lga: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  contactPosition: z.string().optional().or(z.literal("")),
  outstandingBalance: z.coerce.number().default(0),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_CUSTOMERS_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.customer.count({ where: { tenantId: actor.tenantId } }),
        prisma.customer.findMany({
          where: { tenantId: actor.tenantId },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
  
      const rows = await prisma.customer.findMany({
        where: { tenantId: actor.tenantId },
        orderBy: { createdAt: "desc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
  
      return ok(rows, buildPageMeta(rows, take));
    }
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_CUSTOMERS_WRITE.key);
    const body = CreateCustomerSchema.parse(await request.json());
    const meta = requestMeta(request);

    const customer = await prisma.customer.create({
      data: {
        tenantId: actor.tenantId,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        state: body.state || null,
        lga: body.lga || null,
        contactPerson: body.contactPerson || null,
        contactPhone: body.contactPhone || null,
        contactPosition: body.contactPosition || null,
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
