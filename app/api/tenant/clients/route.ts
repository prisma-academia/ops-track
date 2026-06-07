import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateBody = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  otherName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const rows = await prisma.client.findMany({
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_WRITE.key);
    const body = CreateBody.parse(await request.json());
    const meta = requestMeta(request);
    const existing = await prisma.client.findUnique({
      where: { tenantId_email: { tenantId: actor.tenantId, email: body.email.toLowerCase() } },
    });
    if (existing) throw new DomainError(409, "email_taken", "Client email already exists in this tenant.");
    const client = await prisma.client.create({
      data: {
        tenantId: actor.tenantId,
        email: body.email.toLowerCase(),
        firstName: body.firstName ?? null,
        lastName: body.lastName ?? null,
        otherName: body.otherName ?? null,
        phone: body.phone ?? null,
      },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.create",
      tenantId: actor.tenantId,
      targetType: "Client",
      targetId: client.id,
      after: { email: client.email } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({ client });
  } catch (e) {
    return handleError(e);
  }
}
