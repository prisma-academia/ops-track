/**
 * READ-ONLY drift report. Makes no writes.
 *
 *   npx tsx scripts/loss-drift-report.ts
 *
 * Compares stored Transport.litersLost / netTransportFeePaid with the values the new
 * logic (lib/fleet/transport-volume.ts) would derive. Only open transports are expected
 * to change; COMPLETED/CANCELLED are listed for information and are never recomputed.
 * Uses only columns that already exist in production (no dependency on the new migration).
 */
import "dotenv/config";
import { rawPrisma } from "@/lib/db/raw-client";

const n = (v: unknown) => Number(v ?? 0) || 0;

async function main() {
  const transports = await rawPrisma.transport.findMany({
    select: {
      id: true,
      tenantId: true,
      status: true,
      destination: true,
      litersCarried: true,
      ratePerLiter: true,
      maintenanceCost: true,
      litersLost: true,
      totalDeduction: true,
      netTransportFeePaid: true,
      deliveries: {
        select: { litersDespatched: true, litersReceived: true },
      },
      lossLogs: { select: { lostQuantity: true } },
    },
  });

  const rows = [];
  for (const t of transports) {
    const loggedLost = t.lossLogs.reduce((s, l) => s + n(l.lostQuantity), 0);
    const shortfall = t.deliveries.reduce(
      (s, d) =>
        d.litersReceived === null ? s : s + Math.max(0, n(d.litersDespatched) - n(d.litersReceived)),
      0
    );
    const rate = n(t.ratePerLiter);
    const newLost = loggedLost + shortfall;
    const newDeduction = n(t.maintenanceCost) + newLost * rate;
    const newNet = Math.max(0, rate * n(t.litersCarried) - newDeduction);

    const lostDiff = newLost - n(t.litersLost);
    const netDiff = newNet - n(t.netTransportFeePaid);
    if (Math.abs(lostDiff) > 0.01 || Math.abs(netDiff) > 0.01) {
      rows.push({
        id: t.id,
        tenant: t.tenantId.slice(0, 8),
        status: t.status,
        carried: n(t.litersCarried),
        storedLost: n(t.litersLost),
        newLost,
        lostDiff,
        storedNet: n(t.netTransportFeePaid),
        newNet,
        netDiff,
      });
    }
  }

  console.log(`Transports scanned: ${transports.length}`);
  console.log(`With differences:  ${rows.length}`);
  console.log(
    `  open (would change on next recompute): ${rows.filter((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED").length}`
  );
  console.log(
    `  completed/cancelled (left untouched):  ${rows.filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED").length}`
  );
  console.table(rows);
  await rawPrisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
