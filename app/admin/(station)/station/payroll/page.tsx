import { Metadata } from "next";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/db/client";
import { PayrollClient } from "./payroll-client";

export const metadata: Metadata = {
  title: "Payroll Management",
};

export default async function PayrollPage() {
  const actor = await requireTenantPage();

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Payroll Management</h2>
      </div>
      <PayrollClient stations={stations} />
    </div>
  );
}
