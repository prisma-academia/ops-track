import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SalesReportsManager } from "./sales-reports-manager";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";

export default async function SalesReportsPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SALES_REPORTS_READ.key);

  const activeOrgId = await resolveActiveOrgId(actor);

  const salesReportWhere: any = { tenantId: actor.tenantId };
  if (activeOrgId) {
    salesReportWhere.station = { organizationId: activeOrgId };
  }

  const stationWhere: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const salesReports = await prisma.salesLog.findMany({
    where: salesReportWhere,
    orderBy: { logDate: "desc" },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      dippingClosing: {
        include: {
          session: {
            include: {
              closings: {
                orderBy: { recordedAt: "asc" }
              }
            }
          }
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
    where: stationWhere,
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

  // Fetch legacy TankDipping records and DippingSession records for the date range
  const [dippings, dippingSessions] = minDate && maxDate ? await Promise.all([
    prisma.tankDipping.findMany({
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
    }),
    prisma.dippingSession.findMany({
      where: {
        tenantId: actor.tenantId,
        OR: [
          {
            openedAt: {
              gte: minDate,
              lte: maxDate,
            },
          },
          {
            closings: {
              some: {
                recordedAt: {
                  gte: minDate,
                  lte: maxDate,
                },
              },
            },
          },
        ],
      },
      include: {
        tank: true,
        closings: true,
      },
    }),
  ]) : [[], []];

  // Map dippings and dipping sessions into the sales reports server-side
  const mappedReports = salesReports.map((report) => {
    let openingDip = 0;
    let closingDip = 0;
    let pricePerLiter = Number(report.pricePerLiter || 0);

    // 1. Direct relation check if generated via DippingClosing or lookup via dippingClosingId
    if (report.dippingClosing || report.dippingClosingId) {
      let foundClosing = report.dippingClosing;
      let foundSession = report.dippingClosing?.session;

      if (!foundClosing && report.dippingClosingId) {
        for (const ds of dippingSessions) {
          const c = ds.closings.find((c) => c.id === report.dippingClosingId);
          if (c) {
            foundSession = ds as any;
            foundClosing = c as any;
            break;
          }
        }
      }

      if (foundClosing && foundSession) {
        closingDip = Number(foundClosing.closingLiters);
        if (foundClosing.appliedPrice) {
          pricePerLiter = Number(foundClosing.appliedPrice);
        }
        
        // Use closings directly from the included session instead of looking up in dippingSessions
        const sortedClosings = [...(foundSession.closings || [])].sort(
          (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
        );
        
        const closingIndex = sortedClosings.findIndex((c) => c.id === foundClosing.id);
        if (closingIndex > 0) {
          // Opening dip for this specific closing interval is the previous closing's liters
          openingDip = Number(sortedClosings[closingIndex - 1].closingLiters);
        } else {
          // First closing interval opens with session openingLiters
          openingDip = Number(foundSession.openingLiters);
        }
      }
    }

    const logDateStr = report.logDate.toDateString();

    // 2. Check DippingSession records matching date, station, and product type if opening/closing not set
    if (openingDip === 0 || closingDip === 0) {
      dippingSessions.forEach((ds) => {
        const isActiveOnDate = ds.openedAt.toDateString() === logDateStr || ds.closings.some(c => c.recordedAt.toDateString() === logDateStr);
        if (
          ds.stationId === report.stationId &&
          ds.tank?.productType === report.productType &&
          isActiveOnDate
        ) {
          // Attempt to guess the interval by matching the volume sold
          let matched = false;
          let prevLiters = Number(ds.openingLiters);
          const sortedClosings = [...ds.closings].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
          
          for (const c of sortedClosings) {
            const closingLiters = Number(c.closingLiters);
            const sold = prevLiters - closingLiters;
            if (Math.abs(sold - Number(report.litersSold)) < 0.1) {
              openingDip = prevLiters;
              closingDip = closingLiters;
              matched = true;
              break;
            }
            prevLiters = closingLiters;
          }

          if (!matched) {
            if (openingDip === 0) openingDip = Number(ds.openingLiters);
            if (closingDip === 0 && ds.closings.length > 0) {
              closingDip = Number(ds.closings[ds.closings.length - 1].closingLiters);
            }
          }
          if (pricePerLiter === 0) pricePerLiter = Number(ds.pricePerLiter);
        }
      });
    }

    // 3. Fallback to legacy TankDipping records
    if (openingDip === 0 || closingDip === 0) {
      dippings.forEach((dip) => {
        if (
          dip.tank?.stationId === report.stationId &&
          dip.tank?.productType === report.productType &&
          dip.recordedAt.toDateString() === logDateStr
        ) {
          if ((dip.reason === "OPENING_DIP" || dip.shift === "MORNING") && openingDip === 0) {
            openingDip = Number(dip.dippingLiters);
          } else if ((dip.reason === "CLOSING_DIP" || dip.shift === "EVENING") && closingDip === 0) {
            closingDip = Number(dip.dippingLiters);
          }
        }
      });
    }

    const manager = report.recordedBy;
    const stationManagerName = manager
      ? `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() || manager.email
      : "—";

    return {
      ...report,
      openingDip,
      closingDip,
      pricePerLiter,
      stationManagerName,
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
