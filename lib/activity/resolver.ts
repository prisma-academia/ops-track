import { prisma } from "@/lib/db/client";

export async function resolveActivityLogRows(rows: any[]) {
  if (!rows || rows.length === 0) return [];

  const tenantUserIds = Array.from(new Set(rows.filter((r) => r.actorType === "TENANT_USER" && r.actorId).map((r) => r.actorId as string)));
  const stationIds = Array.from(new Set(rows.filter((r) => r.targetType === "Station" && r.targetId).map((r) => r.targetId as string)));
  const orderIds = Array.from(new Set(rows.filter((r) => r.targetType === "Order" && r.targetId).map((r) => r.targetId as string)));
  const transportIds = Array.from(new Set(rows.filter((r) => r.targetType === "Transport" && r.targetId).map((r) => r.targetId as string)));
  const saleIds = Array.from(new Set(rows.filter((r) => r.targetType === "Sale" && r.targetId).map((r) => r.targetId as string)));
  const transactionIds = Array.from(new Set(rows.filter((r) => r.targetType === "Transaction" && r.targetId).map((r) => r.targetId as string)));
  const driverIds = Array.from(new Set(rows.filter((r) => r.targetType === "Driver" && r.targetId).map((r) => r.targetId as string)));
  const transporterIds = Array.from(new Set(rows.filter((r) => r.targetType === "Transporter" && r.targetId).map((r) => r.targetId as string)));
  const truckIds = Array.from(new Set(rows.filter((r) => r.targetType === "Truck" && r.targetId).map((r) => r.targetId as string)));
  const targetUserIds = Array.from(new Set(rows.filter((r) => r.targetType === "TenantUser" && r.targetId).map((r) => r.targetId as string)));

  const allUserIds = Array.from(new Set([...tenantUserIds, ...targetUserIds]));

  const [users, stations, orders, transports, sales, transactions, drivers, transporters, trucks] = await Promise.all([
    allUserIds.length > 0
      ? prisma.tenantUser.findMany({ where: { id: { in: allUserIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [],
    stationIds.length > 0
      ? prisma.station.findMany({ where: { id: { in: stationIds } }, select: { id: true, name: true, code: true } })
      : [],
    orderIds.length > 0
      ? prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, reference: true, productType: true, litersOrdered: true } })
      : [],
    transportIds.length > 0
      ? prisma.transport.findMany({ where: { id: { in: transportIds } }, select: { id: true, destination: true, productType: true, litersCarried: true } })
      : [],
    saleIds.length > 0
      ? prisma.sale.findMany({ where: { id: { in: saleIds } }, select: { id: true, totalExpectedAmount: true, litersDespatched: true } })
      : [],
    transactionIds.length > 0
      ? prisma.transaction.findMany({ where: { id: { in: transactionIds } }, select: { id: true, amount: true, category: true, type: true } })
      : [],
    driverIds.length > 0
      ? prisma.driver.findMany({ where: { id: { in: driverIds } }, select: { id: true, firstName: true, lastName: true } })
      : [],
    transporterIds.length > 0
      ? prisma.transporter.findMany({ where: { id: { in: transporterIds } }, select: { id: true, name: true } })
      : [],
    truckIds.length > 0
      ? prisma.truck.findMany({ where: { id: { in: truckIds } }, select: { id: true, name: true, plateNumber: true } })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const stationMap = new Map(stations.map((s) => [s.id, s]));
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const transportMap = new Map(transports.map((t) => [t.id, t]));
  const saleMap = new Map(sales.map((s) => [s.id, s]));
  const transactionMap = new Map(transactions.map((tx) => [tx.id, tx]));
  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const transporterMap = new Map(transporters.map((tr) => [tr.id, tr]));
  const truckMap = new Map(trucks.map((tk) => [tk.id, tk]));

  return rows.map((r) => {
    let actorDisplay = null;
    if (r.actorType === "TENANT_USER" && r.actorId) {
      const u = userMap.get(r.actorId);
      if (u) {
        actorDisplay = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      }
    } else if (r.actorType === "SYSTEM") {
      actorDisplay = "System Workflow";
    }

    let targetDisplay = null;
    if (r.targetType && r.targetId) {
      if (r.targetType === "Station") {
        const s = stationMap.get(r.targetId);
        if (s) targetDisplay = `Station: ${s.name} (${s.code})`;
      } else if (r.targetType === "TenantUser") {
        const u = userMap.get(r.targetId);
        if (u) targetDisplay = `User: ${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      } else if (r.targetType === "Order") {
        const o = orderMap.get(r.targetId);
        if (o) targetDisplay = `Order: ${o.reference || o.productType} (${Number(o.litersOrdered).toLocaleString()} L)`;
      } else if (r.targetType === "Transport") {
        const tr = transportMap.get(r.targetId);
        if (tr) targetDisplay = `Transport: ${tr.destination} (${tr.productType || ""})`;
      } else if (r.targetType === "Sale") {
        const s = saleMap.get(r.targetId);
        if (s) targetDisplay = `Sale: ₦${Number(s.totalExpectedAmount).toLocaleString()}`;
      } else if (r.targetType === "Transaction") {
        const tx = transactionMap.get(r.targetId);
        if (tx) targetDisplay = `Transaction (${tx.type}): ₦${Number(tx.amount).toLocaleString()}`;
      } else if (r.targetType === "Driver") {
        const d = driverMap.get(r.targetId);
        if (d) targetDisplay = `Driver: ${d.firstName} ${d.lastName}`;
      } else if (r.targetType === "Transporter") {
        const tr = transporterMap.get(r.targetId);
        if (tr) targetDisplay = `Transporter: ${tr.name}`;
      } else if (r.targetType === "Truck") {
        const tk = truckMap.get(r.targetId);
        if (tk) targetDisplay = `Truck: ${tk.name || tk.plateNumber || r.targetId}`;
      }
    }

    return {
      id: r.id,
      tenantId: r.tenantId,
      actorType: r.actorType,
      actorId: r.actorId,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      beforeJson: r.beforeJson,
      afterJson: r.afterJson,
      ip: r.ip,
      userAgent: r.userAgent,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      tenantDisplay: r.tenant?.name || r.tenantId,
      actorDisplay,
      targetDisplay,
    };
  });
}
