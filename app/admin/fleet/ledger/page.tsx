import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { LedgerTable } from "./table";

export default async function LedgerPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const transactions = await prisma.fleetTransaction.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      transporter: { select: { name: true } },
      transport: { select: { id: true, destination: true } },
      sale: { select: { id: true } },
    },
  });

  const rows = transactions.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount),
    reference: tx.reference || "-",
    description: tx.description || "-",
    entityName: tx.transporter?.name || "System",
    relatedRef: tx.transportId ? `Transport: ${tx.transport?.destination}` : tx.saleId ? `Sale: ${tx.sale?.id.slice(0,8)}` : "-",
    status: tx.status,
    createdAt: tx.createdAt.toISOString(),
  }));

  return (
    <div>
      <DataTableToolbar
        title="Fleet Ledger"
        description="View financial transactions, earnings, deductions, and payouts for the fleet."
      />
      <LedgerTable data={rows} />
    </div>
  );
}
