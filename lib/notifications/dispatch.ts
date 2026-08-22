import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/send";
import { notificationEmail } from "@/lib/email/templates";
import { emailBrandFromTenant } from "@/lib/email/branding";
import { sendPushNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import type {
  AppModule,
  NotificationAudienceType,
  NotificationChannel,
  NotificationMessage,
} from "@/lib/generated/prisma/client";

const ALL_CHANNELS: NotificationChannel[] = ["SMS", "EMAIL", "MESSAGE", "IN_APP"];

export type AudienceUser = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  expoPushTokens: string[];
};

export async function getChannelSettings(tenantId: string, module: AppModule) {
  const rows = await prisma.notificationChannelSetting.findMany({
    where: { tenantId, module },
  });
  const byChannel = new Map(rows.map((row) => [row.channel, row.enabled]));
  return ALL_CHANNELS.map((channel) => ({
    channel,
    enabled: byChannel.get(channel) ?? true,
  }));
}

export async function upsertChannelSettings(
  tenantId: string,
  module: AppModule,
  updates: { channel: NotificationChannel; enabled: boolean }[]
) {
  await prisma.$transaction(
    updates.map((update) =>
      prisma.notificationChannelSetting.upsert({
        where: {
          tenantId_module_channel: {
            tenantId,
            module,
            channel: update.channel,
          },
        },
        create: {
          tenantId,
          module,
          channel: update.channel,
          enabled: update.enabled,
        },
        update: { enabled: update.enabled },
      })
    )
  );
  return getChannelSettings(tenantId, module);
}

export async function resolveAudience(input: {
  tenantId: string;
  module: AppModule;
  audienceType: NotificationAudienceType;
  audienceIds: string[];
}): Promise<AudienceUser[]> {
  const base = {
    tenantId: input.tenantId,
    status: "ACTIVE" as const,
    activeModules: { has: input.module },
  };

  const select = {
    id: true,
    email: true,
    phone: true,
    firstName: true,
    lastName: true,
    expoPushTokens: true,
  };

  if (input.audienceType === "USERS") {
    if (input.audienceIds.length === 0) return [];
    return prisma.tenantUser.findMany({
      where: { ...base, id: { in: input.audienceIds } },
      select,
    });
  }

  if (input.audienceType === "STATION") {
    if (input.audienceIds.length === 0) return [];
    return prisma.tenantUser.findMany({
      where: {
        ...base,
        stations: { some: { id: { in: input.audienceIds }, tenantId: input.tenantId } },
      },
      select,
    });
  }

  if (input.audienceType === "ORGANIZATION") {
    if (input.audienceIds.length === 0) return [];
    return prisma.tenantUser.findMany({
      where: {
        ...base,
        OR: [
          { organizationId: { in: input.audienceIds } },
          { stations: { some: { organizationId: { in: input.audienceIds } } } },
          { ownedOrganizations: { some: { id: { in: input.audienceIds } } } },
        ],
      },
      select,
    });
  }

  return prisma.tenantUser.findMany({ where: base, select });
}

export async function dispatchNotificationMessage(message: NotificationMessage) {
  const [settings, recipients, tenant] = await Promise.all([
    getChannelSettings(message.tenantId, message.module),
    resolveAudience({
      tenantId: message.tenantId,
      module: message.module,
      audienceType: message.audienceType,
      audienceIds: message.audienceIds,
    }),
    prisma.tenant.findUnique({
      where: { id: message.tenantId },
      select: { name: true, settingsJson: true },
    }),
  ]);

  const enabled = new Set(settings.filter((s) => s.enabled).map((s) => s.channel));
  const channels = message.channels.filter((channel) => enabled.has(channel));
  const brand = tenant ? emailBrandFromTenant(tenant) : undefined;
  const moduleLabel = message.module === "FLEET" ? "Fleet" : "Station";
  const pushTokens: string[] = [];

  for (const user of recipients) {
    for (const channel of channels) {
      let status: "SENT" | "FAILED" | "SKIPPED" = "SKIPPED";
      let error: string | null = null;

      try {
        if (channel === "EMAIL") {
          await sendEmail({
            to: user.email,
            subject: message.title,
            html: notificationEmail({
              name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
              title: message.title,
              body: message.body,
              moduleLabel,
              brand,
            }),
            text: message.body,
          });
          status = "SENT";
        } else if (channel === "IN_APP") {
          status = "SENT";
          pushTokens.push(...user.expoPushTokens);
        } else {
          status = "SKIPPED";
          error = channel === "SMS"
            ? "SMS provider is not configured."
            : "Message provider is not configured.";
        }
      } catch (err) {
        status = "FAILED";
        error = err instanceof Error ? err.message : "Delivery failed.";
        logger.error({ err, userId: user.id, channel, messageId: message.id }, "notification_delivery_failed");
      }

      await prisma.notificationDelivery.create({
        data: {
          tenantId: message.tenantId,
          messageId: message.id,
          userId: user.id,
          actorType: "TENANT_USER",
          channel,
          status,
          error,
        },
      });
    }
  }

  const uniqueTokens = Array.from(new Set(pushTokens.filter(Boolean)));
  if (uniqueTokens.length > 0) {
    try {
      await sendPushNotification(uniqueTokens, message.title, message.body, {
        type: "inbox",
        messageId: message.id,
        module: message.module,
      });
    } catch (err) {
      logger.error({ err, messageId: message.id }, "notification_push_failed");
    }
  }

  return prisma.notificationMessage.update({
    where: { id: message.id },
    data: { status: "SENT", sentAt: new Date() },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      _count: { select: { deliveries: true } },
    },
  });
}
