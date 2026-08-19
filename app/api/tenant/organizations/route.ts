import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { fleetModuleFilter } from "@/lib/auth/org-scope";

const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50),
  type: z.enum(["INTERNAL", "EXTERNAL"]).default("EXTERNAL"),
  companyEmail: z.string().email().optional().or(z.literal("")),
  companyPhone: z.string().optional().or(z.literal("")),
  ownerId: z.string().optional().or(z.literal("")),
  logoKey: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  lga: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
  contactPhone: z.string().optional().or(z.literal("")),
  contactPosition: z.string().optional().or(z.literal("")),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_ORGANIZATIONS_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");

    // Fleet module filter logic applies: org-scoped see theirs, fleet-wide see all
    const whereClause = {
      tenantId: actor.tenantId,
      ...fleetModuleFilter(actor),
    };

    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.organization.count({ where: whereClause }),
        prisma.organization.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take,
          skip,
          include: {
            _count: {
              select: { stations: true, users: true }
            }
          }
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
  
      const rows = await prisma.organization.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        include: {
          _count: {
            select: { stations: true, users: true }
          }
        }
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_ORGANIZATIONS_WRITE.key);
    
    // Only fleet-wide users can create organizations
    if (actor.organizationId) {
      throw new DomainError(403, "forbidden", "Only fleet-wide admins can create organizations.");
    }

    const body = CreateOrgSchema.parse(await request.json());
    const meta = requestMeta(request);

    // Verify slug uniqueness in this tenant
    const existing = await prisma.organization.findUnique({
      where: {
        tenantId_slug: {
          tenantId: actor.tenantId,
          slug: body.slug.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new DomainError(409, "slug_taken", "Organization slug is already in use for this tenant.");
    }

    const org = await prisma.organization.create({
      data: {
        tenantId: actor.tenantId,
        name: body.name,
        slug: body.slug.toLowerCase(),
        type: body.type,
        companyEmail: body.companyEmail || null,
        companyPhone: body.companyPhone || null,
        ownerId: body.ownerId || null,
        logoKey: body.logoKey || null,
        address: body.address || null,
        state: body.state || null,
        lga: body.lga || null,
        contactPerson: body.contactPerson || null,
        contactPhone: body.contactPhone || null,
        contactPosition: body.contactPosition || null,
      },
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "organization.create",
      tenantId: actor.tenantId,
      targetType: "Organization",
      targetId: org.id,
      after: { name: org.name, slug: org.slug, type: org.type } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ organization: org });
  } catch (e) {
    return handleError(e);
  }
}
