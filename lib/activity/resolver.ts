import { prisma } from "@/lib/db/client";
import { getActivityStatus } from "@/lib/activity/status";

export async function resolveActivityLogRows(rows: any[]) {
  if (!rows || rows.length === 0) return [];

  const tenantUserIds = Array.from(new Set(rows.filter((r) => r.actorType === "TENANT_USER" && r.actorId).map((r) => r.actorId as string)));
  const platformUserActorIds = rows.filter((r) => r.actorType === "PLATFORM_USER" && r.actorId).map((r) => r.actorId as string);
  const platformUserTargetIds = rows.filter((r) => r.targetType === "PlatformUser" && r.targetId).map((r) => r.targetId as string);
  const platformUserIds = Array.from(new Set([...platformUserActorIds, ...platformUserTargetIds]));

  const stationIds = Array.from(new Set(rows.filter((r) => r.targetType === "Station" && r.targetId).map((r) => r.targetId as string)));
  const orderIds = Array.from(new Set(rows.filter((r) => r.targetType === "Order" && r.targetId).map((r) => r.targetId as string)));
  const transportIds = Array.from(new Set(rows.filter((r) => r.targetType === "Transport" && r.targetId).map((r) => r.targetId as string)));
  const saleIds = Array.from(new Set(rows.filter((r) => r.targetType === "Delivery" && r.targetId).map((r) => r.targetId as string)));
  const transactionIds = Array.from(new Set(rows.filter((r) => r.targetType === "Transaction" && r.targetId).map((r) => r.targetId as string)));
  const driverIds = Array.from(new Set(rows.filter((r) => r.targetType === "Driver" && r.targetId).map((r) => r.targetId as string)));
  const transporterIds = Array.from(new Set(rows.filter((r) => r.targetType === "Transporter" && r.targetId).map((r) => r.targetId as string)));
  const truckIds = Array.from(new Set(rows.filter((r) => r.targetType === "Truck" && r.targetId).map((r) => r.targetId as string)));
  const targetUserIds = Array.from(new Set(rows.filter((r) => r.targetType === "TenantUser" && r.targetId).map((r) => r.targetId as string)));
  const roleTemplateIds = Array.from(new Set(rows.filter((r) => r.targetType === "RoleTemplate" && r.targetId).map((r) => r.targetId as string)));
  const targetTenantIds = Array.from(new Set(rows.filter((r) => r.targetType === "Tenant" && r.targetId).map((r) => r.targetId as string)));

  const salesLogIds = Array.from(new Set(rows.filter((r) => r.targetType === "SalesLog" && r.targetId).map((r) => r.targetId as string)));
  const expenseIds = Array.from(new Set(rows.filter((r) => r.targetType === "Expense" && r.targetId).map((r) => r.targetId as string)));
  const shiftIds = Array.from(new Set(rows.filter((r) => r.targetType === "ShiftLog" && r.targetId).map((r) => r.targetId as string)));
  const tankIds = Array.from(new Set(rows.filter((r) => r.targetType === "Tank" && r.targetId).map((r) => r.targetId as string)));
  const pumpIds = Array.from(new Set(rows.filter((r) => r.targetType === "Pump" && r.targetId).map((r) => r.targetId as string)));
  const dippingSessionIds = Array.from(new Set(rows.filter((r) => (r.targetType === "DippingSession" || r.targetType === "TankDipping") && r.targetId).map((r) => r.targetId as string)));
  const priceControlIds = Array.from(new Set(rows.filter((r) => r.targetType === "PriceControl" && r.targetId).map((r) => r.targetId as string)));
  const ticketIds = Array.from(new Set(rows.filter((r) => r.targetType === "Ticket" && r.targetId).map((r) => r.targetId as string)));
  const waybillIds = Array.from(new Set(rows.filter((r) => r.targetType === "Waybill" && r.targetId).map((r) => r.targetId as string)));

  const allUserIds = Array.from(new Set([...tenantUserIds, ...targetUserIds]));

  const [
    users,
    platformUsers,
    stations,
    orders,
    transports,
    deliveries,
    transactions,
    drivers,
    transporters,
    trucks,
    salesLogs,
    expenses,
    shifts,
    tanks,
    pumps,
    dippingSessions,
    priceControls,
    tickets,
    waybills,
    roleTemplates,
    targetTenants,
  ] = await Promise.all([
    allUserIds.length > 0
      ? prisma.tenantUser.findMany({ where: { id: { in: allUserIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [],
    platformUserIds.length > 0
      ? prisma.platformUser.findMany({ where: { id: { in: platformUserIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
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
      ? prisma.delivery.findMany({ where: { id: { in: saleIds } }, select: { id: true, totalExpectedAmount: true, litersDespatched: true } })
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
    salesLogIds.length > 0
      ? prisma.salesLog.findMany({ where: { id: { in: salesLogIds } }, select: { id: true, productType: true, litersSold: true, station: { select: { name: true, code: true } } } })
      : [],
    expenseIds.length > 0
      ? prisma.expense.findMany({ where: { id: { in: expenseIds } }, select: { id: true, category: true, amount: true, description: true, station: { select: { name: true } } } })
      : [],
    shiftIds.length > 0
      ? prisma.shiftLog.findMany({
          where: { id: { in: shiftIds } },
          select: {
            id: true,
            shiftDate: true,
            litersSold: true,
            nozzle: {
              select: {
                name: true,
                pump: { select: { name: true, station: { select: { name: true } } } },
              },
            },
            attendant: { select: { firstName: true, lastName: true } },
          },
        })
      : [],
    tankIds.length > 0
      ? prisma.tank.findMany({ where: { id: { in: tankIds } }, select: { id: true, name: true, productType: true, station: { select: { name: true } } } })
      : [],
    pumpIds.length > 0
      ? prisma.pump.findMany({ where: { id: { in: pumpIds } }, select: { id: true, name: true, station: { select: { name: true } } } })
      : [],
    dippingSessionIds.length > 0
      ? prisma.dippingSession.findMany({ where: { id: { in: dippingSessionIds } }, select: { id: true, tank: { select: { name: true, productType: true } }, station: { select: { name: true } } } })
      : [],
    priceControlIds.length > 0
      ? prisma.priceControl.findMany({ where: { id: { in: priceControlIds } }, select: { id: true, productType: true, pricePerLiter: true, station: { select: { name: true } } } })
      : [],
    ticketIds.length > 0
      ? prisma.ticket.findMany({ where: { id: { in: ticketIds } }, select: { id: true, title: true, status: true, station: { select: { name: true } } } })
      : [],
    waybillIds.length > 0
      ? prisma.waybill.findMany({
          where: { id: { in: waybillIds } },
          select: { id: true, number: true, productType: true, litersLoaded: true },
        })
      : [],
    roleTemplateIds.length > 0
      ? prisma.roleTemplate.findMany({
          where: { id: { in: roleTemplateIds } },
          select: { id: true, name: true },
        })
      : [],
    targetTenantIds.length > 0
      ? prisma.tenant.findMany({
          where: { id: { in: targetTenantIds } },
          select: { id: true, name: true, slug: true },
        })
      : [],
  ]);

  const userMap = new Map(users.map((u) => [u.id, u]));
  const platformUserMap = new Map(platformUsers.map((u) => [u.id, u]));
  const stationMap = new Map(stations.map((s) => [s.id, s]));
  const orderMap = new Map(orders.map((o) => [o.id, o]));
  const transportMap = new Map(transports.map((t) => [t.id, t]));
  const saleMap = new Map(deliveries.map((delivery) => [delivery.id, delivery]));
  const transactionMap = new Map(transactions.map((tx) => [tx.id, tx]));
  const driverMap = new Map(drivers.map((d) => [d.id, d]));
  const transporterMap = new Map(transporters.map((tr) => [tr.id, tr]));
  const truckMap = new Map(trucks.map((tk) => [tk.id, tk]));

  const salesLogMap = new Map(salesLogs.map((s) => [s.id, s]));
  const expenseMap = new Map(expenses.map((e) => [e.id, e]));
  const shiftMap = new Map(shifts.map((sh) => [sh.id, sh]));
  const tankMap = new Map(tanks.map((t) => [t.id, t]));
  const pumpMap = new Map(pumps.map((p) => [p.id, p]));
  const dippingSessionMap = new Map(dippingSessions.map((d) => [d.id, d]));
  const priceControlMap = new Map(priceControls.map((pc) => [pc.id, pc]));
  const ticketMap = new Map(tickets.map((tk) => [tk.id, tk]));
  const waybillMap = new Map(waybills.map((w) => [w.id, w]));
  const roleTemplateMap = new Map(roleTemplates.map((rt) => [rt.id, rt]));
  const targetTenantMap = new Map(targetTenants.map((tt) => [tt.id, tt]));

  return rows.map((r) => {
    let actorDisplay = null;
    if (r.actorType === "TENANT_USER" && r.actorId) {
      const u = userMap.get(r.actorId);
      if (u) {
        actorDisplay = `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email;
      }
    } else if (r.actorType === "PLATFORM_USER" && r.actorId) {
      const pu = platformUserMap.get(r.actorId);
      if (pu) {
        actorDisplay = `${pu.firstName || ""} ${pu.lastName || ""}`.trim() || pu.email;
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
      } else if (r.targetType === "Delivery") {
        const delivery = saleMap.get(r.targetId);
        if (delivery) targetDisplay = `Delivery: ₦${Number(delivery.totalExpectedAmount).toLocaleString()}`;
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
      } else if (r.targetType === "SalesLog") {
        const sl = salesLogMap.get(r.targetId);
        if (sl) targetDisplay = `Sales Log: ${sl.productType} (${Number(sl.litersSold).toLocaleString()} L)`;
      } else if (r.targetType === "Expense") {
        const ex = expenseMap.get(r.targetId);
        if (ex) targetDisplay = `Expense: ${ex.description || ex.category} (₦${Number(ex.amount).toLocaleString()})`;
      } else if (r.targetType === "ShiftLog") {
        const sh = shiftMap.get(r.targetId);
        if (sh) {
          const pumpName = sh.nozzle?.pump?.name || "Pump";
          const attendantName = `${sh.attendant?.firstName || ""} ${sh.attendant?.lastName || ""}`.trim();
          targetDisplay = `Shift: ${pumpName}${attendantName ? ` (${attendantName})` : ""}`;
        }
      } else if (r.targetType === "Tank") {
        const tk = tankMap.get(r.targetId);
        if (tk) targetDisplay = `Tank: ${tk.name} (${tk.productType})`;
      } else if (r.targetType === "Pump") {
        const p = pumpMap.get(r.targetId);
        if (p) targetDisplay = `Pump: ${p.name}`;
      } else if (r.targetType === "DippingSession" || r.targetType === "TankDipping") {
        const ds = dippingSessionMap.get(r.targetId);
        if (ds) targetDisplay = `Dipping: ${ds.tank?.name || "Tank"} (${ds.tank?.productType || ""})`;
      } else if (r.targetType === "PriceControl") {
        const pc = priceControlMap.get(r.targetId);
        if (pc) targetDisplay = `Price: ${pc.productType} @ ₦${Number(pc.pricePerLiter).toLocaleString()}/L`;
      } else if (r.targetType === "Ticket") {
        const tk = ticketMap.get(r.targetId);
        if (tk) targetDisplay = `Ticket: ${tk.title}`;
      } else if (r.targetType === "Waybill") {
        const wb = waybillMap.get(r.targetId);
        if (wb) targetDisplay = `Waybill: ${wb.number || wb.productType} (${Number(wb.litersLoaded).toLocaleString()} L)`;
      } else if (r.targetType === "PlatformUser") {
        const pu = platformUserMap.get(r.targetId);
        if (pu) targetDisplay = `Admin: ${pu.firstName || ""} ${pu.lastName || ""}`.trim() || pu.email;
      } else if (r.targetType === "RoleTemplate") {
        const rt = roleTemplateMap.get(r.targetId);
        if (rt) targetDisplay = `Role: ${rt.name}`;
      } else if (r.targetType === "Tenant") {
        const tt = targetTenantMap.get(r.targetId);
        if (tt) targetDisplay = `Tenant: ${tt.name} (${tt.slug})`;
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
      status: getActivityStatus(r.action),
    };
  });
}

