import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import {
  parsePagination,
  buildPageMeta,
  parseOffsetPagination,
  buildOffsetPageMeta,
} from "@/lib/api/pagination";
import { normalizeSupplierName } from "@/lib/fleet/suppliers";
import { mapSupplierListRow, supplierMetricsOrderInclude } from "@/lib/fleet/supplier-list";

const CreateSupplierSchema = z.object({
  name: z.string().min(2).max(100),
  supplierType: z.enum(["LOCAL", "DEPOT"]),
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SUPPLIERS_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    const tenant = await prisma.tenant.findUnique({
      where: { id: actor.tenantId },
      select: { settingsJson: true },
    });
    const settingsJson = tenant?.settingsJson;

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, suppliers] = await Promise.all([
        prisma.supplier.count({ where: { tenantId: actor.tenantId } }),
        prisma.supplier.findMany({
          where: { tenantId: actor.tenantId },
          orderBy: { name: "asc" },
          take,
          skip,
          include: supplierMetricsOrderInclude,
        }),
      ]);
      const rows = await Promise.all(
        suppliers.map((s) => mapSupplierListRow(s, actor.tenantId, settingsJson))
      );
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    }

    const { cursor, take } = parsePagination(url.searchParams);
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { name: "asc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: supplierMetricsOrderInclude,
    });

    const rows = await Promise.all(
      suppliers.map((s) => mapSupplierListRow(s, actor.tenantId, settingsJson))
    );
    return ok(rows, buildPageMeta(suppliers, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_SUPPLIERS_WRITE.key);
    const body = CreateSupplierSchema.parse(await request.json());
    const meta = requestMeta(request);

    const supplier = await prisma.supplier.create({
      data: {
        tenantId: actor.tenantId,
        name: normalizeSupplierName(body.name),
        supplierType: body.supplierType,
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
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "supplier.create",
      tenantId: actor.tenantId,
      targetType: "Supplier",
      targetId: supplier.id,
      after: { name: supplier.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ supplier });
  } catch (e) {
    return handleError(e);
  }
}
