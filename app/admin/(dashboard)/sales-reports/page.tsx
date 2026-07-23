import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SalesReportsManager } from "./sales-reports-manager";

export default async function SalesReportsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SHIFTS_READ.key);

  const salesReports = await prisma.salesLog.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { logDate: "desc" },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      recordedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  // Calculate the date range of the fetched sales reports to scope the dippings query
  let minDate: Date | undefined;
  let maxDate: Date | undefined;

  if (salesReports.length > 0) {
    minDate = new Date(Math.min(...salesReports.map(r => r.logDate.getTime())));
    maxDate = new Date(Math.max(...salesReports.map(r => r.logDate.getTime())));
    // Extend maxDate to the end of the day
    maxDate.setHours(23, 59, 59, 999);
    // Extend minDate to start of the day
    minDate.setHours(0, 0, 0, 0);
  }

  // Only fetch dippings if we have reports
  const dippings = minDate && maxDate ? await prisma.tankDipping.findMany({
    where: { 
      tenantId: actor.tenantId,
      recordedAt: {
        gte: minDate,
        lte: maxDate,
      }
    },
    include: {
      tank: {
        select: {
          productType: true,
          stationId: true,
        },
      },
    },
  }) : [];

  // Map the dippings directly into the sales reports server-side
  const mappedReports = salesReports.map((report) => {
    const logDateStr = report.logDate.toDateString();
    let openingDip = 0;
    let closingDip = 0;

    dippings.forEach((dip) => {
      if (
        dip.tank?.stationId === report.stationId &&
        dip.tank?.productType === report.productType
      ) {
        if (dip.recordedAt.toDateString() === logDateStr) {
          if (dip.reason === "OPENING_DIP" || dip.shift === "MORNING") {
            openingDip += Number(dip.dippingLiters);
          } else if (dip.reason === "CLOSING_DIP" || dip.shift === "EVENING") {
            closingDip += Number(dip.dippingLiters);
          }
        }
      }
    });

    return {
      ...report,
      openingDip,
      closingDip,
    };
  });

  const serializedReports = JSON.parse(JSON.stringify(mappedReports));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <SalesReportsManager
      initialReports={serializedReports}
      stations={serializedStations}
    />
  );
}
