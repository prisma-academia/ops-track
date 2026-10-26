import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { SalesTable } from "./table";
import { FleetStatGroupCard } from "../_components/overview/fleet-stat-group-card";
import type { FleetStatGroup } from "../types";
import { formatDestination, formatTruckLabel } from "@/lib/utils";
import { resolveDeliveryCreatedAtFilter } from "@/lib/fleet/delivery-sales-metrics";
import {
  b2bDeliveryWhere,
  computeStationCollectionByDeliveryId,
  managedStationDeliveryWhere,
} from "@/lib/fleet/delivery-station-collection";
import { resolveShortageParty } from "@/lib/fleet/loss-attribution";
import { format } from "date-fns";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatLitersFull(value: number) {
  return `${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L`;
}

function resolveDeliveriesPeriodHint(from?: string, to?: string) {
  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
      return `${format(fromDate, "MMM d, yyyy")} – ${format(toDate, "MMM d, yyyy")}`;
    }
  }
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) return `From ${format(fromDate, "MMM d, yyyy")}`;
  }
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) return `Until ${format(toDate, "MMM d, yyyy")}`;
  }
  return "All deliveries";
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    status?: string;
    customerStationId?: string;
    minVol?: string;
    maxVol?: string;
    page?: string;
    take?: string;
    view?: string;
  }>;
}) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SALES_READ.key);
  const {
    from,
    to,
    status,
    customerStationId,
    minVol,
    maxVol,
    page: pageParam,
    take: takeParam,
    view: viewParam,
  } = await searchParams;

  const view = viewParam === "b2b" ? "b2b" : "stations";

  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const take = Math.min(100, Math.max(1, parseInt(takeParam || "25", 10) || 25));
  const skip = (page - 1) * take;

  const where: any = { tenantId: actor.tenantId };
  if (status) where.status = status;
  if (customerStationId) {
    if (customerStationId.startsWith("c-")) {
      where.customerId = customerStationId.replace("c-", "");
    } else if (customerStationId.startsWith("s-")) {
      where.stationId = customerStationId.replace("s-", "");
    }
  }
  if (minVol || maxVol) {
    where.litersDespatched = {
      ...(minVol ? { gte: Number(minVol) } : {}),
      ...(maxVol ? { lte: Number(maxVol) } : {}),
    };
  }
  where.createdAt = resolveDeliveryCreatedAtFilter(from, to);

  const audienceWhere = view === "stations" ? managedStationDeliveryWhere() : b2bDeliveryWhere();
  const listWhere = { ...where, ...audienceWhere };

  const [customers, stations] = await Promise.all([
    prisma.customer.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } }),
    prisma.station.findMany({ where: { tenantId: actor.tenantId }, select: { id: true, name: true } })
  ]);
  const csOptions = [
    ...customers.map(c => ({ value: `c-${c.id}`, label: `Customer: ${c.name}` })),
    ...stations.map(s => ({ value: `s-${s.id}`, label: `Station: ${s.name}` }))
  ];

  const [statsAgg, totalCount, tabCounts, statusBreakdown, Deliveries] = await Promise.all([
    prisma.delivery.aggregate({
      where: listWhere,
      _sum: {
        litersDespatched: true,
        totalExpectedAmount: true,
        paymentReceived: true,
      },
    }),
    prisma.delivery.count({ where: listWhere }),
    Promise.all([
      prisma.delivery.count({ where: { ...where, ...managedStationDeliveryWhere() } }),
      prisma.delivery.count({ where: { ...where, ...b2bDeliveryWhere() } }),
    ]),
    prisma.delivery.groupBy({
      by: ["status"],
      where: listWhere,
      _count: { _all: true },
    }),
    prisma.delivery.findMany({
      where: listWhere,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        customer: { select: { id: true, name: true } },
        station: { select: { id: true, name: true } },
        organization: { select: { id: true, name: true } },
        transport: {
          select: {
            id: true,
            status: true,
            destination: true,
            productType: true,
            ratePerLiter: true,
            isOneTime: true,
            oneTimeTruckPlate: true,
            oneTimeTransporterName: true,
            transporter: { select: { id: true, name: true } },
            truck: { select: { id: true, name: true, plateNumber: true, truckNumber: true } },
            order: {
              select: {
                id: true,
                reference: true,
                sourceDepot: true,
                supplierRecord: { select: { supplierType: true } },
              },
            },
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    }),
  ]);

  const totalVolume = Number(statsAgg._sum.litersDespatched) || 0;
  const totalExpected = Number(statsAgg._sum.totalExpectedAmount) || 0;
  const totalCollected = Number(statsAgg._sum.paymentReceived) || 0;
  const outstanding = Math.max(0, totalExpected - totalCollected);
  const collectionRate =
    totalExpected > 0 ? Math.min(100, (totalCollected / totalExpected) * 100) : totalCollected > 0 ? 100 : 0;

  const statusCount = (status: string) =>
    statusBreakdown.find((row) => row.status === status)?._count._all ?? 0;
  const unpaidCount = statusCount("UNPAID");
  const partPaidCount = statusCount("PART_PAID");
  const overdueCount = statusCount("OVERDUE");
  const clearedCount = statusCount("CLEARED");

  const periodHint = resolveDeliveriesPeriodHint(from, to);

  const stationIdsOnPage = [
    ...new Set(
      Deliveries.map((d) => d.stationId).filter((id): id is string => Boolean(id))
    ),
  ];

  const fifoDeliveryRows =
    view === "stations" && stationIdsOnPage.length > 0
      ? await prisma.delivery.findMany({
          where: {
            tenantId: actor.tenantId,
            ...managedStationDeliveryWhere(),
            stationId: { in: stationIdsOnPage },
            createdAt: where.createdAt,
          },
          select: {
            id: true,
            stationId: true,
            createdAt: true,
            totalExpectedAmount: true,
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

  const stationCollectionByDeliveryId =
    fifoDeliveryRows.length > 0
      ? await computeStationCollectionByDeliveryId(
          actor.tenantId,
          fifoDeliveryRows.map((d) => ({
            id: d.id,
            stationId: d.stationId as string,
            createdAt: d.createdAt,
            totalExpectedAmount: Number(d.totalExpectedAmount),
          }))
        )
      : new Map();

  const rows = Deliveries.map((delivery) => {
    const litersDespatched = Number(delivery.litersDespatched);
    const litersReceived = delivery.litersReceived ? Number(delivery.litersReceived) : null;
    const variance = litersReceived !== null ? litersDespatched - litersReceived : null;
    const isExternalClient = !delivery.stationId;
    const productType = delivery.transport?.productType || "PMS";
    const volumeUnit = productType === "LPG" ? "KG" : "L";
    const transportRate = delivery.transport ? Number(delivery.transport.ratePerLiter || 0) : 0;

    const depotName = delivery.transport?.order?.sourceDepot?.trim() || "Depot";
    const primaryDestination = delivery.transport?.destination
      ? formatDestination(delivery.transport.destination)
      : null;
    const route = primaryDestination
      ? `${depotName} to ${primaryDestination}`
      : depotName;

    const truckLabel = delivery.transport ? formatTruckLabel(delivery.transport) : null;
    const validTruck =
      truckLabel &&
      truckLabel !== "Unassigned Truck" &&
      truckLabel.toLowerCase() !== "unknown"
        ? truckLabel
        : null;

    const transportDetails = delivery.transport
      ? validTruck
        ? `${route} • ${validTruck}`
        : route
      : "Direct / No Transport";

    const customerName =
      delivery.customer?.name ||
      delivery.station?.name ||
      delivery.organization?.name ||
      "Walk-in Client";

    const stationCollection = delivery.stationId
      ? stationCollectionByDeliveryId.get(delivery.id)
      : undefined;

    return {
      id: delivery.id,
      stationId: delivery.stationId,
      customerName,
      transportDetails,
      litersDespatched,
      litersReceived,
      litersReturned: Number(delivery.litersReturned || 0),
      shortageDeducted: delivery.shortageDeducted ?? true,
      variance,
      amountPerLiter: Number(delivery.amountPerLiter),
      totalExpectedAmount: Number(delivery.totalExpectedAmount),
      paymentReceived: Number(delivery.paymentReceived),
      status: delivery.status,
      transactionCount: delivery._count.transactions,
      createdAt: delivery.createdAt.toISOString(),
      isExternalClient,
      volumeUnit,
      transportId: delivery.transportId,
      transportStatus: delivery.transport ? delivery.transport.status : null,
      transportRate,
      shortageParty: resolveShortageParty(
        delivery.transport?.order?.supplierRecord?.supplierType ?? null
      ),
      stationRetailCollected: stationCollection?.collected ?? null,
      stationRetailRemaining: stationCollection?.remaining ?? null,
      stationCollectionPercent: stationCollection?.percent ?? null,
    };
  });

  const totalPages = Math.ceil(totalCount / take);

  const statGroups: FleetStatGroup[] = [
    {
      id: "delivery-volume",
      title: "Delivery volume",
      accent: "blue",
      headerIcon: "volume",
      hint: `${totalCount.toLocaleString()} deliveries · ${periodHint}`,
      metrics: [
        {
          label: "Dispatched",
          icon: "sold",
          value: formatLitersFull(totalVolume),
          tooltip: formatLitersFull(totalVolume),
        },
        {
          label: "On record",
          icon: "ordered",
          value: totalCount.toLocaleString(),
          tooltip: `${totalCount.toLocaleString()} deliveries match current filters`,
        },
      ],
    },
    {
      id: "sales-collections",
      title: "Sales & collections",
      accent: "emerald",
      headerIcon: "sales",
      hint: `${collectionRate.toFixed(1)}% collected · ${periodHint}`,
      metrics: [
        {
          label: "Expected",
          icon: "expected",
          value: formatNaira(totalExpected),
          tooltip: formatNaira(totalExpected),
        },
        {
          label: "Collected",
          icon: "collected",
          value: formatNaira(totalCollected),
          tooltip: formatNaira(totalCollected),
        },
      ],
    },
    {
      id: "receivables-tracking",
      title: "Receivables",
      accent: "amber",
      headerIcon: "sales",
      hint: `${unpaidCount} unpaid · ${partPaidCount} part paid · ${overdueCount} overdue`,
      metrics: [
        {
          label: "Outstanding",
          icon: "expected",
          value: formatNaira(outstanding),
          tooltip: formatNaira(outstanding),
        },
        {
          label: "Cleared",
          icon: "paid",
          value: clearedCount.toLocaleString(),
          tooltip: `${clearedCount.toLocaleString()} deliveries fully cleared`,
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Deliveries"
        createHref="/admin/deliveries/new"
        createLabel="Log Delivery"
        description="Manage B2B Deliveries and bulk deliveries to clients."
      />
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {statGroups.map((group) => (
          <FleetStatGroupCard key={group.id} group={group} />
        ))}
      </div>

      <SalesTable
        data={rows}
        view={view}
        tabCounts={{ stations: tabCounts[0], b2b: tabCounts[1] }}
        serverPagination={{
          page,
          pageSize: take,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        }}
        filterConfigs={[
          {
            type: "combobox",
            paramName: "customerStationId",
            label: "Customer / Station",
            options: csOptions,
          },
          {
            type: "select",
            paramName: "status",
            label: "Status",
            options: [
              { value: "UNPAID", label: "Unpaid" },
              { value: "PART_PAID", label: "Part Paid" },
              { value: "CLEARED", label: "Cleared" },
              { value: "OVERDUE", label: "Overdue" },
            ],
          },
          {
            type: "number-range",
            label: "Volume Range (Liters)",
            fromParam: "minVol",
            toParam: "maxVol",
          },
          {
            type: "date-range",
            label: "Date Range",
            fromParam: "from",
            toParam: "to",
          },
        ]}
      />
    </div>
  );
}

