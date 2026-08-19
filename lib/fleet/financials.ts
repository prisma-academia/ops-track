import { prisma } from "@/lib/db/client";

export type LegPnL = {
  legName: string;
  revenue: number;
  cogs: number;
  transportFee: number;
  shortageDeduction: number;
  expenses: number;
  profit: number;
};

export type TripPnLSummary = {
  transportId: string;
  legs: LegPnL[];
  totalRevenue: number;
  totalCogs: number;
  totalTransportFee: number;
  totalShortageDeduction: number;
  totalExpenses: number;
  expenseDetails: { id: string; description: string; amount: number; createdAt: Date }[];
  netProfit: number;
  transporterDebtRollover: number;
};

export type OrderPnLSummary = {
  orderId: string;
  totalRevenue: number;
  totalCogs: number;
  totalLoadingCost: number;
  totalTransportFeesPaid: number;
  totalTripExpenses: number;
  totalOrderExpenses: number;
  orderExpenseDetails: { id: string; description: string; amount: number; createdAt: Date }[];
  netProfit: number;
  trips: TripPnLSummary[];
};

export async function calculateTripPnL(transportId: string): Promise<TripPnLSummary> {
  const transport = await prisma.transport.findUnique({
    where: { id: transportId },
    include: {
      order: true,
      deliveries: true,
      lossLogs: true,
      transactions: {
        where: { category: "EXPENSE" },
      },
    },
  });

  if (!transport) throw new Error("Transport not found");

  const order = transport.order;
  const Deliveries = transport.deliveries;
  const expenses = transport.transactions;

  const costPerLiter = Number(order?.pricePerLitre || 0);
  const primaryRate = Number(transport.ratePerLiter || 0);
  const primaryDelivered = Number(transport.litersDelivered || 0);
  const litersLost = Number(transport.litersLost || 0);
  const maintenanceCost = Number(transport.maintenanceCost || 0);

  // Deprecated: transportTripLegs was replaced by a relation.
  // let transportTripLegs: { location: string; rate: number; litersDelivered: number }[] = [];
  // try {
  //   if (transport.transportTripLegs) {
  //     transportTripLegs = typeof transport.transportTripLegs === "string" 
  //       ? JSON.parse(transport.transportTripLegs) 
  //       : transport.transportTripLegs;
  //   }
  // } catch (e) {
  //   console.error("Error parsing transportTripLegs", e);
  // }

  // Calculate Average Delivery Price per Liter for the Trip
  // Since Deliveries might not perfectly map 1-to-1 with Legs by ID, we use average Delivery price to estimate Leg Revenue
  let totalSalesRevenue = 0;
  let totalSalesLiters = 0;
  for (const Delivery of Deliveries) {
    const saleRevenue = Number(Delivery.litersReceived || Delivery.litersDespatched || 0) * Number(Delivery.amountPerLiter || 0);
    const transportCostBilled = Delivery.transportCostBorneBy === "CLIENT" ? Number(Delivery.transportCost || 0) : 0;
    totalSalesRevenue += saleRevenue + transportCostBilled;
    totalSalesLiters += Number(Delivery.litersReceived || Delivery.litersDespatched || 0);
  }
  const avgSalePricePerLiter = totalSalesLiters > 0 ? totalSalesRevenue / totalSalesLiters : 0;

  const sumSecondaryDelivered = 0; // transportTripLegs.reduce((sum, loc) => sum + Number(loc.litersDelivered || 0), 0);
  const litersCarried = Number(transport.litersCarried || 0);
  
  // Calculate primary volume delivered by subtracting losses and secondary deliveries from total carried
  const primaryVolume = transport.litersDelivered 
    ? Number(transport.litersDelivered) 
    : Math.max(0, litersCarried - litersLost - sumSecondaryDelivered);

  const legs: LegPnL[] = [];

  // LEG 1: Primary Destination
  const leg1Revenue = primaryVolume * avgSalePricePerLiter;
  const leg1Cogs = primaryVolume * costPerLiter;
  const leg1TransportFee = primaryVolume * primaryRate;
  const leg1ShortageDeduction = litersLost * costPerLiter;
  const leg1Expenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0) + maintenanceCost;

  legs.push({
    legName: `Depot to ${transport.destination}`,
    revenue: leg1Revenue,
    cogs: leg1Cogs,
    transportFee: leg1TransportFee,
    shortageDeduction: leg1ShortageDeduction,
    expenses: leg1Expenses,
    profit: leg1Revenue - leg1Cogs - leg1TransportFee - leg1ShortageDeduction - leg1Expenses,
  });



  // Aggregate totals
  const totalRevenue = legs.reduce((sum, leg) => sum + leg.revenue, 0);
  const totalCogs = legs.reduce((sum, leg) => sum + leg.cogs, 0);
  const totalShortageDeduction = legs.reduce((sum, leg) => sum + leg.shortageDeduction, 0);
  const totalExpenses = legs.reduce((sum, leg) => sum + leg.expenses, 0);
  
  // Calculate Gross Transport Fee and Deductions to determine Rollover Debt
  const grossTransportFee = legs.reduce((sum, leg) => sum + leg.transportFee, 0);
  const transporterDeductions = totalShortageDeduction + maintenanceCost;
  
  let netTransportFeePaid = grossTransportFee - transporterDeductions;
  let transporterDebtRollover = 0;

  if (netTransportFeePaid < 0) {
    transporterDebtRollover = Math.abs(netTransportFeePaid);
    netTransportFeePaid = 0; // Transporter isn't paid, and owes the balance
  }

  const netProfit = totalRevenue - totalCogs - netTransportFeePaid - totalExpenses - totalShortageDeduction;

  return {
    transportId,
    legs,
    totalRevenue,
    totalCogs,
    totalTransportFee: netTransportFeePaid, // Adjusted for deductions
    totalShortageDeduction,
    totalExpenses,
    expenseDetails: expenses.map(e => ({
      id: e.id,
      description: e.description || "General Expense",
      amount: Number(e.amount),
      createdAt: e.createdAt,
    })),
    netProfit,
    transporterDebtRollover,
  };
}

export async function calculateOrderPnL(orderId: string): Promise<OrderPnLSummary> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      transports: true,
      transactions: {
        where: { category: "EXPENSE" },
      },
    },
  });

  if (!order) throw new Error("Order not found");

  const transports = order.transports;
  const orderExpensesList = order.transactions;

  let totalRevenue = 0;
  let totalCogs = 0;
  let totalTransportFeesPaid = 0;
  let totalTripExpenses = 0;
  const trips: TripPnLSummary[] = [];

  for (const t of transports) {
    const tripPnL = await calculateTripPnL(t.id);
    trips.push(tripPnL);
    totalRevenue += tripPnL.totalRevenue;
    totalCogs += tripPnL.totalCogs;
    totalTransportFeesPaid += tripPnL.totalTransportFee;
    totalTripExpenses += tripPnL.totalExpenses;
  }

  const totalLoadingCost = Number(order.loadingCostPerLitre || 0) * Number(order.litersOrdered || 0);
  const totalOrderExpenses = orderExpensesList.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const netProfit = totalRevenue - totalCogs - totalLoadingCost - totalTransportFeesPaid - totalTripExpenses - totalOrderExpenses;

  return {
    orderId,
    totalRevenue,
    totalCogs,
    totalLoadingCost,
    totalTransportFeesPaid,
    totalTripExpenses,
    totalOrderExpenses,
    orderExpenseDetails: orderExpensesList.map(e => ({
      id: e.id,
      description: e.description || "Order Expense",
      amount: Number(e.amount),
      createdAt: e.createdAt,
    })),
    netProfit,
    trips,
  };
}
