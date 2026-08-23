import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { DippingsManager, type DippingRow } from "./dippings-manager";

export const metadata = { title: "Dippings" };

export default async function DippingsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_DIPPINGS_READ.key);

  const activeOrgId = await resolveActiveOrgId(actor);

  const stationWhere = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const orgStationFilter = activeOrgId
    ? { station: { organizationId: activeOrgId } }
    : {};

  const [stations, tanks, sessions, tankDippings, waybillDippings] = await Promise.all([
    prisma.station.findMany({
      where: stationWhere,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.tank.findMany({
      where: { tenantId: actor.tenantId, station: stationWhere },
      select: {
        id: true,
        name: true,
        stationId: true,
        productType: true,
        station: { select: { name: true } },
      },
      orderBy: [{ station: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.dippingSession.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
      },
      include: {
        station: { select: { id: true, name: true, code: true } },
        tank: { select: { id: true, name: true, productType: true } },
        closings: { orderBy: { recordedAt: "asc" } },
      },
      orderBy: { openedAt: "desc" },
    }),
    prisma.tankDipping.findMany({
      where: {
        tenantId: actor.tenantId,
        tank: orgStationFilter,
      },
      include: {
        tank: {
          select: {
            id: true,
            name: true,
            productType: true,
            station: { select: { id: true, name: true, code: true } },
          },
        },
      },
      orderBy: { recordedAt: "desc" },
    }),
    prisma.waybillDipping.findMany({
      where: {
        tenantId: actor.tenantId,
        tank: orgStationFilter,
      },
      include: {
        tank: {
          select: {
            id: true,
            name: true,
            productType: true,
            station: { select: { id: true, name: true, code: true } },
          },
        },
        waybill: { select: { number: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const rows: DippingRow[] = [];

  for (const session of sessions) {
    rows.push({
      id: `session-open-${session.id}`,
      source: "SESSION",
      stationId: session.stationId,
      stationName: session.station.name,
      stationCode: session.station.code,
      tankId: session.tankId,
      tankName: session.tank.name,
      productType: session.tank.productType,
      dippingType: "OPENING",
      reason: "OPENING_DIP",
      dippingLiters: Number(session.openingLiters),
      afterLiters: Number(session.openingLiters),
      recordedAt: session.openedAt.toISOString(),
    });

    for (const closing of session.closings) {
      const before = Number(session.openingLiters);
      const after = Number(closing.closingLiters);
      rows.push({
        id: `session-close-${closing.id}`,
        source: "SESSION",
        stationId: session.stationId,
        stationName: session.station.name,
        stationCode: session.station.code,
        tankId: session.tankId,
        tankName: session.tank.name,
        productType: session.tank.productType,
        dippingType: "CLOSING",
        reason: closing.reason,
        dippingLiters: after,
        beforeLiters: before,
        afterLiters: after,
        variance: after - before,
        recordedAt: closing.recordedAt.toISOString(),
      });
    }
  }

  for (const dip of tankDippings) {
    const station = dip.tank.station;
    const dippingType: DippingRow["dippingType"] =
      dip.dippingType === "CLOSING" ||
      dip.reason === "CLOSING_DIP" ||
      dip.shift === "EVENING"
        ? "CLOSING"
        : "OPENING";

    rows.push({
      id: dip.id,
      source: "LEGACY",
      stationId: station.id,
      stationName: station.name,
      stationCode: station.code,
      tankId: dip.tankId,
      tankName: dip.tank.name,
      productType: dip.tank.productType,
      dippingType,
      reason: dip.reason || dip.shift,
      dippingLiters: Number(dip.dippingLiters),
      afterLiters: Number(dip.dippingLiters),
      recordedAt: dip.recordedAt.toISOString(),
    });
  }

  for (const dip of waybillDippings) {
    const station = dip.tank.station;
    const before = Number(dip.beforeLiters);
    const after = dip.afterLiters != null ? Number(dip.afterLiters) : null;

    rows.push({
      id: dip.id,
      source: "WAYBILL",
      stationId: station.id,
      stationName: station.name,
      stationCode: station.code,
      tankId: dip.tankId,
      tankName: dip.tank.name,
      productType: dip.tank.productType,
      dippingType: "WAYBILL",
      reason: dip.waybill?.number ? `Waybill ${dip.waybill.number}` : "WAYBILL DISCHARGE",
      dippingLiters: after != null ? after - before : 0,
      beforeLiters: before,
      afterLiters: after,
      variance: after != null ? after - before : null,
      recordedAt: dip.createdAt.toISOString(),
    });
  }

  rows.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

  return (
    <DippingsManager
      initialRows={JSON.parse(JSON.stringify(rows))}
      stations={JSON.parse(JSON.stringify(stations))}
      tanks={JSON.parse(
        JSON.stringify(
          tanks.map((tank) => ({
            id: tank.id,
            name: tank.name,
            stationId: tank.stationId,
            stationName: tank.station.name,
            productType: tank.productType,
          }))
        )
      )}
    />
  );
}
