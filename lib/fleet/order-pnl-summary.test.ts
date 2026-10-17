import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary";
import { defaultFleetSettings } from "@/lib/fleet/fleet-settings";

describe("order-pnl-summary", () => {
  const baseOrder = {
    id: "o1",
    reference: "T-1",
    sourceDepot: "Depot",
    productType: "PMS",
    litersOrdered: 10000,
    pricePerLitre: 100,
    loadingCostPerLitre: 10,
    createdAt: new Date().toISOString(),
    transports: [
      {
        id: "t1",
        ratePerLiter: 5,
        litersCarried: 10000,
        maintenanceCost: 0,
        deliveries: [
          {
            id: "d1",
            litersDespatched: 8000,
            litersReceived: 8000,
            amountPerLiter: 150,
            totalExpectedAmount: 8000 * 150,
            paymentReceived: 0,
            status: "UNPAID",
            createdAt: new Date().toISOString(),
          },
        ],
        lossLogs: [],
      },
    ],
  };

  it("attribution mode uses sold-litre costs only", () => {
    const fleet = { ...defaultFleetSettings(), useAttributionPnL: true };
    const { summary } = calculateOrderPnlSummary(baseOrder, { fleet, useAttributionPnL: true });
    assert.equal(summary.totalAmountSoldQty, 8000);
    assert.equal(summary.qtyBalance, 2000);
    assert.ok(summary.inventoryAtCost === 2000 * 110);
    const expectedSoldCost = 8000 * 110 + 8000 * 5;
    assert.equal(summary.totalCost, expectedSoldCost);
    assert.equal(summary.pnl, summary.amountSoldRev - summary.totalCost);
  });
});
