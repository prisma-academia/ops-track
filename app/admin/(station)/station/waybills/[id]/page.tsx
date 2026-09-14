import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { WaybillDetailsManager } from "./waybill-details-manager";

export default async function WaybillDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);
  const { id } = await params;

  const waybill = await prisma.waybill.findUnique({
    where: { id },
    include: {
      recordedBy: true,
      allocations: {
        include: {
          station: true,
        },
        orderBy: {
          station: { name: "asc" },
        },
      },
      dippings: {
        include: {
          tank: {
            include: {
              station: true,
            },
          },
          recordedBy: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!waybill || waybill.tenantId !== actor.tenantId) {
    return notFound();
  }

  const stationIds = waybill.allocations.map((a) => a.stationId);
  const compatibleTanks = await prisma.tank.findMany({
    where: {
      tenantId: actor.tenantId,
      stationId: { in: stationIds },
      productType: waybill.productType,
    },
    select: {
      id: true,
      name: true,
      stationId: true,
      capacity: true,
      currentLiters: true,
      productType: true,
    },
    orderBy: { name: "asc" },
  });

  const canEditDippings =
    actor.permissions.has(PERMISSIONS.TENANT_WAYBILL_DIPPINGS_WRITE.key) ||
    actor.permissions.has(PERMISSIONS.TENANT_WAYBILLS_WRITE.key);

  const serializedAllocations = waybill.allocations.map((a) => ({
    ...a,
    litersToDispense: Number(a.litersToDispense),
    litersReceived: a.litersReceived ? Number(a.litersReceived) : null,
    costPerLiter: Number(a.costPerLiter),
    transportationCost: Number(a.transportationCost),
    gpsLatitude: a.gpsLatitude ? Number(a.gpsLatitude) : null,
    gpsLongitude: a.gpsLongitude ? Number(a.gpsLongitude) : null,
    arrivalTime: a.arrivalTime ? a.arrivalTime.toISOString() : null,
    deliveredAt: a.deliveredAt ? a.deliveredAt.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    productType: waybill.productType,
    station: {
      ...a.station,
      latitude: a.station.latitude ? Number(a.station.latitude) : null,
      longitude: a.station.longitude ? Number(a.station.longitude) : null,
      altitude: a.station.altitude ? Number(a.station.altitude) : null,
      createdAt: a.station.createdAt.toISOString(),
      updatedAt: a.station.updatedAt.toISOString(),
    },
  }));

  const serializedDippings = waybill.dippings.map((dip) => ({
    id: dip.id,
    waybillId: dip.waybillId,
    waybillAllocationId: dip.waybillAllocationId,
    tankId: dip.tankId,
    beforeLiters: Number(dip.beforeLiters),
    afterLiters: dip.afterLiters != null ? Number(dip.afterLiters) : null,
    createdAt: dip.createdAt.toISOString(),
    tank: {
      id: dip.tank.id,
      name: dip.tank.name,
      stationId: dip.tank.stationId,
      capacity: Number(dip.tank.capacity),
      currentLiters: Number(dip.tank.currentLiters),
      productType: dip.tank.productType,
      station: {
        id: dip.tank.station.id,
        name: dip.tank.station.name,
      },
    },
    recordedBy: dip.recordedBy
      ? {
          firstName: dip.recordedBy.firstName,
          lastName: dip.recordedBy.lastName,
        }
      : null,
  }));

  const serializedCompatibleTanks = compatibleTanks.map((t) => ({
    id: t.id,
    name: t.name,
    stationId: t.stationId,
    capacity: Number(t.capacity),
    currentLiters: Number(t.currentLiters),
    productType: t.productType,
  }));

  const serializedWaybill = {
    id: waybill.id,
    number: waybill.number,
    productType: waybill.productType,
    litersLoaded: Number(waybill.litersLoaded),
    truckPlate: waybill.truckPlate,
    driverName: waybill.driverName,
    driverPhone: waybill.driverPhone,
    supplier: waybill.supplier,
    depot: waybill.depot,
    transportCompany: waybill.transportCompany,
    pictures: Array.isArray(waybill.pictures) ? (waybill.pictures as string[]) : [],
    dispatchedAt: waybill.dispatchedAt.toISOString(),
    deliveryDatetime: waybill.deliveryDatetime ? waybill.deliveryDatetime.toISOString() : null,
    recordedBy: waybill.recordedBy
      ? {
          firstName: waybill.recordedBy.firstName,
          lastName: waybill.recordedBy.lastName,
        }
      : null,
    allocations: serializedAllocations,
    dippings: serializedDippings,
  };

  return (
    <WaybillDetailsManager
      waybill={serializedWaybill}
      compatibleTanks={serializedCompatibleTanks}
      canEditDippings={canEditDippings}
    />
  );
}
