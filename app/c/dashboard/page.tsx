import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireClientPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { LogoutButton } from "@/components/logout-button";
import { ClientPortalDashboard } from "./client-portal-dashboard";

export default async function ClientDashboardPage() {
  const actor = await requireClientPage();

  const [client, tenant] = await Promise.all([
    prisma.client.findUnique({
      where: { id: actor.clientId },
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
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        drivers: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
        },
        fuelOrders: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            station: { select: { name: true, code: true } },
            vehicle: { select: { plateNumber: true } },
            driver: { select: { fullName: true } },
          },
        },
        walletLedgers: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    }),
    prisma.tenant.findUnique({ where: { id: actor.tenantId } }),
  ]);

  if (!client || !tenant) redirect("/auth/login");

  const serializedClient = {
    ...client,
    depositBalance: Number(client.depositBalance),
    outstandingDebt: Number(client.outstandingDebt),
    creditLimit: Number(client.creditLimit),
    dailyMaxLiters: client.dailyMaxLiters ? Number(client.dailyMaxLiters) : null,
    vehicles: client.vehicles.map((v) => ({
      ...v,
      tankCapacity: Number(v.tankCapacity),
      dailyLimitLiters: v.dailyLimitLiters ? Number(v.dailyLimitLiters) : null,
      createdAt: v.createdAt.toISOString(),
    })),
    drivers: (client.drivers || []).map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
    fuelOrders: client.fuelOrders.map((o) => ({
      ...o,
      liters: Number(o.liters),
      pricePerLiter: Number(o.pricePerLiter),
      totalAmount: Number(o.totalAmount),
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <PageHeader
        title={tenant.name}
        action={
          <LogoutButton
            endpoint="/api/auth/logout"
            postLogoutPath="/auth/login"
            logoutContext="client"
          />
        }
      />
      <ClientPortalDashboard client={serializedClient} tenantName={tenant.name} />
    </div>
  );
}
