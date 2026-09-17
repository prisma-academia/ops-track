import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateBody = z.object({
  tenantId:    z.string().min(1),
  amount:      z.number().positive(),
  currency:    z.string().length(3).default("NGN"),
  description: z.string().max(500).optional(),
  receiptRef:  z.string().max(200).optional(),
  startDate:   z.string().datetime(),
  endDate:     z.string().datetime(),
});

export async function GET(request: Request) {
  try {
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_READ.key);
    void actor;
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const tenantId = url.searchParams.get("tenantId");
    const rows = await prisma.tenantSubscription.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { recordedAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const body = CreateBody.parse(await request.json());
    const meta = requestMeta(request);
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    if (endDate <= startDate) {
      throw new DomainError(400, "invalid_dates", "End date must be after start date.");
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: body.tenantId } });
    if (!tenant) throw new DomainError(404, "tenant_not_found", "Tenant not found.");
    const subscription = await prisma.tenantSubscription.create({
      data: {
        tenantId:    body.tenantId,
        amount:      body.amount,
        currency:    body.currency,
        description: body.description ?? null,
        receiptRef:  body.receiptRef ?? null,
        startDate,
        endDate,
        status:      "ACTIVE",
        recordedById: actor.userId,
      },
    });
    await audit({
      actorType: "PLATFORM_USER", actorId: actor.userId,
      action: "tenant.subscription.create", tenantId: body.tenantId,
      targetType: "TenantSubscription", targetId: subscription.id,
      after: { amount: body.amount, currency: body.currency, startDate: body.startDate, endDate: body.endDate },
      ip: meta.ip, userAgent: meta.userAgent,
    });
    return ok({ subscription }, undefined, 201);
  } catch (e) {
    return handleError(e);
  }
}
