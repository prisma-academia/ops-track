import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { hashPassword, generateTempPassword, recordPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { PLATFORM_EMAIL_BRAND } from "@/lib/email/branding";
import { env } from "@/lib/env";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";
import { ALL_PLATFORM_PERMISSION_KEYS } from "@/lib/auth/permissions";

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
    await requirePlatformActor(PERMISSIONS.PLATFORM_USERS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const rows = await prisma.platformUser.findMany({
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
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_USERS_WRITE.key);
    const body = InviteBody.parse(await request.json());
    const meta = requestMeta(request);

    const role = await prisma.roleTemplate.findUnique({ where: { id: body.roleTemplateId } });
    if (!role || role.scope !== "PLATFORM") {
      throw new DomainError(400, "invalid_role", "Role template is not a platform role.");
    }
    const allowed = new Set<string>(ALL_PLATFORM_PERMISSION_KEYS);
    const requestedPerms = body.permissions ?? role.permissions;
    const perms = requestedPerms.filter((p) => allowed.has(p));

    const existing = await prisma.platformUser.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) throw new DomainError(409, "email_taken", "Email already in use.");

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const user = await prisma.platformUser.create({
      data: {
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
    await recordPassword("PLATFORM", user.id, passwordHash);
    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: "platform_user.invite",
      tenantId: null,
      targetType: "PlatformUser",
      targetId: user.id,
      after: { email: user.email, role: role.name, permissions: perms } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const loginUrl = `http://${env.APP_DOMAIN}/auth/login`;
    await sendEmail({
      to: body.email,
      subject: "You're invited to the platform",
      html: inviteEmail({
        name: `${body.firstName} ${body.lastName}`,
        loginUrl,
        tempPassword,
        subjectLabel: "the platform admin console",
        brand: PLATFORM_EMAIL_BRAND,
      }),
    });
    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}
