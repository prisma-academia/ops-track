import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TransportReportManager } from "./transport-report-manager";

function toNum(value: unknown) {
  return Number(value ?? 0) || 0;
}

function sellingPricePerLiter(deliveries: Array<{ amountPerLiter: unknown }>) {
  for (const delivery of deliveries) {
    const price = toNum(delivery.amountPerLiter);
    if (price > 0) return price;
  }
  return 0;
}

/** Selling price to customer/station × shortage liters (never purchase/order cost). */
function expectedShortageDeduction(transport: {
  litersCarried: unknown;
  litersDelivered: unknown;
  litersLost: unknown;
  deliveries: Array<{
    litersDespatched: unknown;
    litersReceived: unknown;
    amountPerLiter: unknown;
  }>;
}) {
  let amount = 0;
  let shortageLiters = 0;
  let receivedLiters = 0;

  for (const delivery of transport.deliveries) {
    const despatched = toNum(delivery.litersDespatched);
    const price = toNum(delivery.amountPerLiter);
    if (delivery.litersReceived == null) {
      receivedLiters += despatched;
      continue;
    }
    const received = toNum(delivery.litersReceived);
    receivedLiters += received;
    const shortage = despatched - received;
    if (shortage <= 0) continue;
    shortageLiters += shortage;
    amount += shortage * price;
  }

  const loaded = toNum(transport.litersCarried);
  const delivered =
    transport.litersDelivered == null ? receivedLiters : toNum(transport.litersDelivered);
  const unallocatedLost = Math.max(
    toNum(transport.litersLost) - shortageLiters,
    loaded > 0 ? loaded - delivered - shortageLiters : 0
  );

  if (unallocatedLost > 0) {
    amount += unallocatedLost * sellingPricePerLiter(transport.deliveries);
  }

  return amount;
}

function summarizeTransportFinances(transport: {
  litersCarried: unknown;
  litersDelivered: unknown;
  litersLost: unknown;
  ratePerLiter: unknown;
  maintenanceCost: unknown;
  totalDeduction: unknown;
  deliveries: Array<{
    transportCost: unknown;
    litersDespatched: unknown;
    litersReceived: unknown;
    amountPerLiter: unknown;
  }>;
  transactions: Array<{ type: string; category: string; amount: unknown }>;
  lossLogs: Array<{ expensesIncurred: unknown }>;
}) {
  const paidTransport = transport.transactions
    .filter((txn) => txn.type === "OUTFLOW" && txn.category === "TRANSPORT_PAYMENT")
    .reduce((sum, txn) => sum + toNum(txn.amount), 0);
  const expectedFee =
    toNum(transport.litersCarried) * toNum(transport.ratePerLiter) +
    transport.deliveries.reduce((sum, delivery) => sum + toNum(delivery.transportCost), 0);

  const loggedDeduction = transport.lossLogs.reduce(
    (sum, log) => sum + toNum(log.expensesIncurred),
    0
  );
  const lossDeduction = Math.max(loggedDeduction, toNum(transport.totalDeduction));
  const amountToDeduct = expectedShortageDeduction(transport);
  const hasLossDeduction = lossDeduction > 0;

  const totalFee = Math.max(0, (expectedFee > 0 ? expectedFee : paidTransport) - lossDeduction);

  let fleetTripExpense = toNum(transport.maintenanceCost);

  for (const txn of transport.transactions) {
    if (txn.type !== "OUTFLOW") continue;
    const amount = toNum(txn.amount);
    if (txn.category === "FLEET_EXPENSE" || txn.category === "EXPENSE") {
      fleetTripExpense += amount;
    }
  }

  const transportExpense = expectedFee > 0 ? expectedFee : paidTransport;
  const totalExpense = transportExpense + fleetTripExpense + lossDeduction;

  return {
    expectedFee,
    totalFee,
    transportExpense,
    fleetTripExpense,
    hasLossDeduction,
    lossDeduction,
    amountToDeduct,
    totalExpense,
    net: totalFee - fleetTripExpense,
  };
}

export default async function TransportReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_REPORTS_READ.key);

  const transports = await prisma.transport.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      truck: {
        select: {
          id: true,
          plateNumber: true,
          name: true,
        },
      },
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      transporter: {
        select: {
          id: true,
          name: true,
        },
      },
      order: {
        select: {
          id: true,
          reference: true,
        },
      },
      deliveries: {
        select: {
          id: true,
          litersDespatched: true,
          litersReceived: true,
          amountPerLiter: true,
          transportCost: true,
        },
      },
      transactions: {
        select: {
          type: true,
          category: true,
          amount: true,
        },
      },
      lossLogs: {
        select: {
          expensesIncurred: true,
        },
      },
    },
  });

  const rows = transports.map((transport) => {
    const finances = summarizeTransportFinances(transport);
    return {
      id: transport.id,
      createdAt: transport.createdAt.toISOString(),
      status: transport.status,
      litersCarried: toNum(transport.litersCarried),
      truck: transport.truck ? { plateNumber: transport.truck.plateNumber } : undefined,
      driver: transport.driver
        ? { firstName: transport.driver.firstName, lastName: transport.driver.lastName }
        : undefined,
      transporter: { id: transport.transporter.id, name: transport.transporter.name },
      order: transport.order ? { reference: transport.order.reference ?? "" } : undefined,
      deliveries: transport.deliveries.map((delivery) => ({
        litersDespatched: toNum(delivery.litersDespatched),
        litersReceived: delivery.litersReceived == null ? null : toNum(delivery.litersReceived),
        amountPerLiter: toNum(delivery.amountPerLiter),
      })),
      ...finances,
    };
  });

  return <TransportReportManager initialTransports={rows} />;
}
