import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { dispatchNotificationMessage, getChannelSettings } from "@/lib/notifications/dispatch";
import { notificationPermission } from "@/lib/notifications/permissions";

const ModuleSchema = z.enum(["STATION", "FLEET"]);
const ChannelSchema = z.enum(["SMS", "EMAIL", "MESSAGE", "IN_APP"]);
const AudienceSchema = z.enum(["ALL_MODULE_USERS", "STATION", "ORGANIZATION", "USERS"]);

const CreateSchema = z.object({
  module: ModuleSchema,
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(4000),
  channels: z.array(ChannelSchema).min(1),
  audienceType: AudienceSchema,
  audienceIds: z.array(z.string()).default([]),
  send: z.boolean().optional().default(true),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const module = ModuleSchema.parse(url.searchParams.get("module") ?? "STATION");
    const actor = await requireTenantActor(notificationPermission(module, false), module);

    const messages = await prisma.notificationMessage.findMany({
      where: { tenantId: actor.tenantId, module },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { deliveries: true } },
      },
    });

    return ok({ messages });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const body = CreateSchema.parse(await request.json());
    const actor = await requireTenantActor(notificationPermission(body.module, true), body.module);
    const meta = requestMeta(request);

    if (body.audienceType !== "ALL_MODULE_USERS" && body.audienceIds.length === 0) {
      throw new DomainError(400, "validation", "Select at least one audience target.");
    }

    const settings = await getChannelSettings(actor.tenantId, body.module);
    const enabled = new Set(settings.filter((s) => s.enabled).map((s) => s.channel));
    const channels = body.channels.filter((channel) => enabled.has(channel));
    if (channels.length === 0) {
      throw new DomainError(400, "validation", "None of the selected channels are enabled.");
    }

    const created = await prisma.notificationMessage.create({
      data: {
        tenantId: actor.tenantId,
        module: body.module,
        title: body.title,
        body: body.body,
        channels,
        audienceType: body.audienceType,
        audienceIds: body.audienceIds,
        audienceActorType: "TENANT_USER",
        createdById: actor.userId,
        status: "DRAFT",
      },
    });

    const message = body.send ? await dispatchNotificationMessage(created) : created

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: body.send ? "notification.send" : "notification.create",
      tenantId: actor.tenantId,
      targetType: "NotificationMessage",
      targetId: message.id,
      after: { title: message.title, module: message.module, status: message.status } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ message });
  } catch (e) {
    return handleError(e);
  }
}
