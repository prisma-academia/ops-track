import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { hashPassword, generateTempPassword, recordPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";

const InviteBody = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  otherName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  roleTemplateId: z.string().min(1),
  permissions: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_USERS_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    
    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.tenantUser.count({ where: { tenantId: actor.tenantId } }),
        prisma.tenantUser.findMany({
          where: { tenantId: actor.tenantId },
          orderBy: { createdAt: "desc" },
          take,
          skip,
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
      const rows = await prisma.tenantUser.findMany({
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
    const actor = await requireTenantActor(PERMISSIONS.TENANT_USERS_WRITE.key);
    const body = InviteBody.parse(await request.json());
    const meta = requestMeta(request);

    const role = await prisma.roleTemplate.findUnique({ where: { id: body.roleTemplateId } });
    if (!role || role.scope !== "TENANT" || role.tenantId !== actor.tenantId) {
      throw new DomainError(400, "invalid_role", "Role template not in this tenant.");
    }
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const requestedPerms = body.permissions ?? role.permissions;
    const perms = requestedPerms.filter((p) => allowed.has(p));

    const existing = await prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId: actor.tenantId, email: body.email.toLowerCase() } },
    });
    if (existing) throw new DomainError(409, "email_taken", "Email already in use in this tenant.");

    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const user = await prisma.tenantUser.create({
      data: {
        tenantId: actor.tenantId,
        email: body.email.toLowerCase(),
        firstName: body.firstName,
        lastName: body.lastName,
        otherName: body.otherName ?? null,
        phone: body.phone ?? null,
        passwordHash,
        mustChangePassword: true,
        permissions: perms,
      },
    });
    await recordPassword("TENANT", user.id, passwordHash);
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.invite",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: user.id,
      after: { email: user.email, role: role.name, permissions: perms } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (role.name !== "Attendant") {
      const loginUrl = `http://${tenant.slug}.${env.APP_DOMAIN}/admin/auth/login`;
      await sendEmail({
        to: body.email,
        subject: `You're invited to ${tenant.name}`,
        html: inviteEmail({
          name: `${body.firstName} ${body.lastName}`,
          loginUrl,
          tempPassword,
          subjectLabel: tenant.name,
        }),
      });
    }

    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}
