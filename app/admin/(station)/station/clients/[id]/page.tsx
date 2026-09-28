import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { ClientResetPasswordAction } from "./reset-action";
import { ClientDetailManager } from "./client-detail-manager";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_CLIENTS_READ.key);

  const [client, allStations] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        allowedStations: {
          include: {
            station: {
              select: {
                id: true,
                code: true,
                name: true,
                location: true,
                state: true,
              },
            },
          },
        },
        vehicles: {
          orderBy: { createdAt: "desc" },
        },
        drivers: {
          orderBy: { createdAt: "desc" },
        },
        fuelOrders: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            station: { select: { id: true, name: true, code: true } },
            vehicle: { select: { id: true, plateNumber: true, makeModel: true, fuelType: true } },
            driver: { select: { id: true, fullName: true, phone: true } },
            manager: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
        walletLedgers: {
          orderBy: { createdAt: "desc" },
          take: 25,
        },
      },
    }),
    prisma.station.findMany({
      where: { tenantId: actor.tenantId },
      select: {
        id: true,
        code: true,
        name: true,
        location: true,
        state: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!client || client.tenantId !== actor.tenantId) notFound();

  // Serialize BigDecimals / Dates for client component
  const serializedClient = {
    ...client,
    depositBalance: Number(client.depositBalance),
    outstandingDebt: Number(client.outstandingDebt),
    creditLimit: Number(client.creditLimit),
    dailyMaxLiters: client.dailyMaxLiters ? Number(client.dailyMaxLiters) : null,
    approvalThresholdLiters: client.approvalThresholdLiters ? Number(client.approvalThresholdLiters) : null,
    createdAt: client.createdAt.toISOString(),
    lastLoginAt: client.lastLoginAt?.toISOString() ?? null,
    vehicles: client.vehicles.map((v) => ({
      ...v,
      tankCapacity: Number(v.tankCapacity),
      dailyLimitLiters: v.dailyLimitLiters ? Number(v.dailyLimitLiters) : null,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
    drivers: client.drivers.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    })),
    fuelOrders: client.fuelOrders.map((o) => ({
      ...o,
      liters: Number(o.liters),
      pricePerLiter: Number(o.pricePerLiter),
      totalAmount: Number(o.totalAmount),
      platformFee: Number(o.platformFee),
      odometerReading: o.odometerReading ? Number(o.odometerReading) : null,
      createdAt: o.createdAt.toISOString(),
    })),
    walletLedgers: client.walletLedgers.map((l) => ({
      ...l,
      amount: Number(l.amount),
      balanceBefore: Number(l.balanceBefore),
      balanceAfter: Number(l.balanceAfter),
      createdAt: l.createdAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={client.companyName || client.email}
        backHref="/admin/station/clients"
        action={<ClientResetPasswordAction clientId={client.id} />}
      />
      <ClientDetailManager client={serializedClient} allStations={allStations} />
    </div>
  );
}
