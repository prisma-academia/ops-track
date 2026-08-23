import { prisma } from "@/lib/db/client";
// import { sendPushNotification } from "@/lib/notifications";

export async function checkAndCreateVarianceTicket({
  tenantId,
  stationId,
  raisedById,
  varianceType,
  expectedVolume,
  actualVolume,
  tankId,
  waybillId,
  referenceNumber,
  tx,
}: {
  tenantId: string;
  stationId: string;
  raisedById: string;
  varianceType: "TANK_DIPPING" | "WAYBILL_DELIVERY";
  expectedVolume: number;
  actualVolume: number;
  tankId?: string;
  waybillId?: string;
  referenceNumber: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx?: any;
}) {
  const varianceVolume = expectedVolume - actualVolume;

  if (varianceVolume <= 0) {
    return null;
  }

  const db = tx || prisma;

  // Get tenant threshold
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  const settings = (tenant?.settingsJson as Record<string, unknown>) || {};
  const threshold = Number(settings.varianceThreshold || 0);

  if (varianceVolume > threshold) {
    // Create Ticket and VarianceLog
    const title =
      varianceType === "TANK_DIPPING"
        ? `Inventory Variance Detected - Tank ${referenceNumber}`
        : `Waybill Shortage - Waybill #${referenceNumber}`;

    const description = `Expected: ${expectedVolume}L, Actual: ${actualVolume}L, Variance: ${varianceVolume}L.`;

    const ticket = await db.ticket.create({
      data: {
        tenantId,
        stationId,
        raisedById,
        category: "INVENTORY_VARIANCE",
        origin: "SYSTEM",
        title,
        description,
        status: "OPEN",
        varianceLog: {
          create: {
            tenantId,
            varianceType,
            expectedVolume,
            actualVolume,
            varianceVolume,
            tankId,
            waybillId,
          },
        },
      },
    });

    // Notify Managers/Supervisors
    try {
      const managers = await db.tenantUser.findMany({
        where: {
          tenantId,
          // We can notify any user who is an owner or has STATION_TICKETS_WRITE permission
          // Adjust based on your role schema. For now we will assume the presence of expoPushTokens.
          status: "ACTIVE",
        },
      });

      const pushTokens = managers.flatMap((m: { expoPushTokens?: string[] | null }) => m.expoPushTokens || []);
      
      if (pushTokens.length > 0) {
        // Send Expo Push Notification
        const message = {
          to: pushTokens,
          sound: "default",
          title: "Inventory Variance Alert",
          body: title,
          data: { ticketId: ticket.id },
        };

        fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        }).catch(err => console.error("Expo push error:", err));
      }
    } catch (e) {
      console.error("Failed to send push notifications for variance:", e);
    }

    return ticket;
  }

  return null;
}
