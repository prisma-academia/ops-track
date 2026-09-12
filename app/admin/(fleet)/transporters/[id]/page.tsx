import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { TransporterDetailsManager } from "./transporter-details-manager";

export default async function TransporterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_TRUCKS_READ.key);

  const transporter = await prisma.transporter.findUnique({
    where: { id },
    include: {
      trucks: {
        orderBy: { createdAt: "desc" },
      },
      drivers: {
        orderBy: { createdAt: "desc" },
      },
      transports: {
        where: { tenantId: actor.tenantId },
        orderBy: { createdAt: "desc" },
        include: {
          truck: { select: { id: true, name: true, plateNumber: true, truckType: true, truckBrand: true, capacityLiters: true } },
          driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
          order: { select: { id: true, reference: true, productType: true, sourceDepot: true } },
          lossLogs: {
            select: {
              id: true,
              lossType: true,
              lostQuantity: true,
              expensesIncurred: true,
            },
          },
          deliveries: {
            select: {
              id: true,
              litersDespatched: true,
              litersReceived: true,
              transportRate: true,
              transportCost: true,
              status: true,
              station: { select: { id: true, name: true, code: true } },
              customer: { select: { id: true, name: true } },
            },
          },
          _count: {
            select: { deliveries: true },
          },
        },
      },
    },
  });

  if (!transporter || transporter.tenantId !== actor.tenantId) {
    redirect("/admin/transporters");
  }

  const transports = transporter.transports || [];

  const overviewRows = transports.map((t) => {
    const liters = Number(t.litersCarried || 0);
    const rate = Number(t.ratePerLiter || 0);

    const lossLogs = t.lossLogs || [];
    const loggedLostQuantity = lossLogs.reduce(
      (sum, log) => sum + Number(log.lostQuantity || 0),
      0
    );
    const litersLost = loggedLostQuantity > 0 ? loggedLostQuantity : Number(t.litersLost || 0);

    const loggedDeductions = lossLogs.reduce(
      (sum, log) => sum + Number(log.expensesIncurred || 0),
      0
    );
    const totalDeduction = Math.max(Number(t.totalDeduction || 0), loggedDeductions);
    const deductions = totalDeduction + Number(t.maintenanceCost || 0);
    const expected = Math.max(0, liters * rate - deductions);
    const paid = Number(t.netTransportFeePaid || 0);
    const balance = Math.max(0, expected - paid);

    return {
      id: t.id,
      createdAt: t.createdAt.toISOString(),
      destination: t.destination,
      orderId: t.orderId || "",
      orderReference: t.order?.reference || "—",
      sourceDepot: t.order?.sourceDepot || "—",
      productType: t.productType || t.order?.productType || "—",
      truckId: t.truckId || "",
      truckName: t.truck?.name || "—",
      truckPlate: t.truck?.plateNumber || "—",
      driverId: t.driverId || "",
      driverName: t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "—",
      litersCarried: liters,
      ratePerLiter: rate,
      totalDeduction: totalDeduction,
      litersLost: litersLost,
      maintenanceCost: Number(t.maintenanceCost || 0),
      expectedFee: expected,
      netTransportFeePaid: paid,
      outstandingBalance: balance,
      status: t.status,
      deliveriesCount: t._count.deliveries || (t.deliveries?.length ?? 0),
    };
  });

  const stats = {
    totalDeliveries: overviewRows.length,
    activeDeliveries: overviewRows.filter((r) => r.status === "IN_TRANSIT").length,
    completedDeliveries: overviewRows.filter((r) => r.status === "COMPLETED").length,
    totalPaid: overviewRows.reduce((sum, r) => sum + r.netTransportFeePaid, 0),
    totalExpected: overviewRows.reduce((sum, r) => sum + r.expectedFee, 0),
    totalOutstanding: overviewRows.reduce((sum, r) => sum + r.outstandingBalance, 0),
    totalVolume: overviewRows.reduce((sum, r) => sum + r.litersCarried, 0),
    totalDeductions: overviewRows.reduce((sum, r) => sum + r.totalDeduction, 0),
    totalLitersLost: overviewRows.reduce((sum, r) => sum + (r.litersLost || 0), 0),
  };

  const serializedTransporter = JSON.parse(JSON.stringify(transporter));

  return (
    <TransporterDetailsManager
      transporter={serializedTransporter}
      overviewRows={overviewRows}
      stats={stats}
    />
  );
}
