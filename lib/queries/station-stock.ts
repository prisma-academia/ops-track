import { prisma } from "@/lib/db/client";

export async function getStationStockData(tenantId: string) {
  const stationsData = await prisma.station.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      code: true,
      tanks: {
        select: { productType: true, currentLiters: true }
      },
      waybillAllocations: {
        where: { status: "DISPATCHED" },
        select: {
          litersToDispense: true,
          waybill: { select: { productType: true } }
        }
      }
    },
    orderBy: { name: "asc" },
  });

  return stationsData.map(station => {
    const stock = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 };
    const expected = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 };

    station.tanks.forEach(tank => {
      if (tank.productType in stock) {
        stock[tank.productType as keyof typeof stock] += Number(tank.currentLiters);
      }
    });

    station.waybillAllocations.forEach(allocation => {
      const pType = allocation.waybill.productType;
      if (pType in expected) {
        expected[pType as keyof typeof expected] += Number(allocation.litersToDispense);
      }
    });

    return {
      stationId: station.id,
      stationName: station.name,
      stationCode: station.code,
      stock,
      expected
    };
  });
}
