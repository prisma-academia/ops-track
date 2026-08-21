import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const CreateTransporterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(1),
  registrationNumber: z.string().optional().nullable(),
  businessType: z.string().min(1),
  contactPerson: z.string().min(1),
  contactPhone: z.string().min(1),
  contactPosition: z.string().min(1),
  state: z.string().min(1),
  lga: z.string().min(1),
  ward: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  kycDocuments: z.any().optional(), // Can be JSON
  ownership: z.enum(["COMPANY_OWNED", "EXTERNAL"]).optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRUCKS_READ.key, "FLEET");
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);

    const rows = await prisma.transporter.findMany({
      where: { tenantId: actor.tenantId },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        _count: {
          select: {
            trucks: true,
            drivers: true,
            transports: true,
          },
        },
      },
    });

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_TRUCKS_WRITE.key, "FLEET");
    const body = CreateTransporterSchema.parse(await request.json());
    const meta = requestMeta(request);

    const transporter = await prisma.transporter.create({
      data: {
        tenantId: actor.tenantId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        registrationNumber: body.registrationNumber ?? null,
        businessType: body.businessType ?? null,
        contactPerson: body.contactPerson ?? null,
        contactPhone: body.contactPhone ?? null,
        contactPosition: body.contactPosition ?? null,
        state: body.state ?? null,
        lga: body.lga ?? null,
        ward: body.ward ?? null,
        address: body.address ?? null,
        kycDocuments: body.kycDocuments ?? {},
        ownership: body.ownership ?? "EXTERNAL",
      },
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transporter.create",
      tenantId: actor.tenantId,
      targetType: "Transporter",
      targetId: transporter.id,
      after: { name: transporter.name } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ transporter });
  } catch (e) {
    return handleError(e);
  }
}
