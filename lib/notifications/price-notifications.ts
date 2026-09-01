import { prisma } from "@/lib/db/client";
import { sendPushNotification } from "@/lib/notifications";
import { logger } from "@/lib/logger";
import { formatHumanReadableDate } from "@/lib/utils";

const FUEL_LABELS: Record<string, string> = {
  PMS: "PMS (Petrol)",
  AGO: "AGO (Diesel)",
  DPK: "DPK (Kerosene)",
  LPG: "LPG (Cooking Gas)",
};

export async function notifyStationManagersPriceChange(input: {
  tenantId: string;
  actorId: string;
  station: { id: string; name: string };
  prices: Record<string, number>;
  effectiveDate?: Date | null;
}) {
  const { tenantId, actorId, station, prices, effectiveDate } = input;

  try {
    // 1. Find active managers / staff assigned to this station
    const managers = await prisma.tenantUser.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        activeModules: { has: "STATION" },
        stations: { some: { id: station.id, tenantId } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        expoPushTokens: true,
      },
    });

    // 2. Filter strictly to station managers who use the mobile APP (have registered push tokens)
    const appManagers = managers.filter(
      (m) => Array.isArray(m.expoPushTokens) && m.expoPushTokens.length > 0
    );

    if (appManagers.length === 0) {
      logger.info(
        { stationId: station.id, stationName: station.name },
        "price_update_notification_skipped_no_app_managers"
      );
      return;
    }

    // 3. Format price update details
    const priceLines = Object.entries(prices)
      .filter(([, price]) => typeof price === "number" && price > 0)
      .map(([fuelType, price]) => {
        const label = FUEL_LABELS[fuelType] || fuelType;
        return `• ${label}: ₦${price.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}/L`;
      });

    if (priceLines.length === 0) return;

    const isFuture = effectiveDate && effectiveDate.getTime() > Date.now() + 60000;
    const effectiveText = isFuture
      ? `Effective from: ${formatHumanReadableDate(effectiveDate)}`
      : "Effective: Immediately";

    const title = `Price Update: ${station.name}`;
    const body = `New fuel pump prices updated for ${station.name}:\n${priceLines.join("\n")}\n\n${effectiveText}`;

    // 4. Create NotificationMessage record in the system
    const message = await prisma.notificationMessage.create({
      data: {
        tenantId,
        module: "STATION",
        title,
        body,
        channels: ["IN_APP"],
        audienceType: "USERS",
        audienceIds: appManagers.map((m) => m.id),
        audienceActorType: "TENANT_USER",
        createdById: actorId,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    // 5. Create in-app delivery records for each recipient
    await prisma.notificationDelivery.createMany({
      data: appManagers.map((m) => ({
        tenantId,
        messageId: message.id,
        userId: m.id,
        actorType: "TENANT_USER",
        channel: "IN_APP",
        status: "SENT",
      })),
    });

    // 6. Gather unique push tokens and send Expo push notifications
    const allTokens = appManagers.flatMap((m) => m.expoPushTokens);
    const uniqueTokens = Array.from(new Set(allTokens.filter(Boolean)));

    if (uniqueTokens.length > 0) {
      await sendPushNotification(uniqueTokens, title, body, {
        type: "price_update",
        action: "station.price_update",
        stationId: station.id,
        stationName: station.name,
        messageId: message.id,
        prices,
        effectiveDate: effectiveDate ? effectiveDate.toISOString() : null,
      });

      logger.info(
        {
          stationId: station.id,
          managerCount: appManagers.length,
          tokenCount: uniqueTokens.length,
        },
        "price_update_push_notification_dispatched"
      );
    }
  } catch (err) {
    logger.error(
      { err, stationId: station.id, stationName: station.name },
      "price_update_notification_failed"
    );
  }
}
