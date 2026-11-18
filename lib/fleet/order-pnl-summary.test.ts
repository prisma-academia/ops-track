import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateOrderPnlSummary } from "@/lib/fleet/order-pnl-summary";
import { sumOrderBreakdownPnl } from "@/lib/fleet/order-pnl-breakdown-pnl";
import { defaultFleetSettings } from "@/lib/fleet/fleet-settings";
import { buildFleetPnlDetailRows } from "@/app/admin/(fleet)/fleet-pnl-report/fleet-pnl-detail-rows";

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
    const { summary, transports } = calculateOrderPnlSummary(baseOrder, {
      fleet,
      useAttributionPnL: true,
    });
    assert.equal(summary.totalAmountSoldQty, 8000);
    assert.equal(summary.qtyBalance, 2000);
    assert.ok(summary.inventoryAtCost === 2000 * 110);
    const expectedSoldCost = 8000 * 110 + 8000 * 5;
    assert.equal(summary.totalCost, expectedSoldCost);
    assert.equal(
      summary.pnl,
      sumOrderBreakdownPnl(transports, summary.priceBought, summary.loadingCostPerLitre, fleet, true)
    );
    assert.equal(summary.pnl, summary.amountSoldRev - summary.totalCost);
  });

  it("uses received litres for P&L when received is less than dispatched", () => {
    const fleet = { ...defaultFleetSettings(), useAttributionPnL: true };
    const order = {
      ...baseOrder,
      transports: [
        {
          ...baseOrder.transports[0],
          deliveries: [
            {
              ...baseOrder.transports[0].deliveries[0],
              litersDespatched: 10000,
              litersReceived: 7500,
              totalExpectedAmount: 7500 * 150,
            },
          ],
        },
      ],
    };
    const { summary, transports } = calculateOrderPnlSummary(order, {
      fleet,
      useAttributionPnL: true,
    });
    const deliveryRow = transports[0].deliveries[0];
    assert.equal(deliveryRow.litersSold, 7500);
    assert.equal(deliveryRow.purchaseCost, 7500 * 100);
    assert.equal(deliveryRow.salesRevenue, 7500 * 150);
    assert.equal(summary.totalAmountSoldQty, 7500);
    assert.equal(summary.pnl, deliveryRow.pnl);
  });

  it("legacy mode P&L is realized sale profit, not unsold stock", () => {
    const fleet = defaultFleetSettings();
    const { summary, transports } = calculateOrderPnlSummary(baseOrder, { fleet });
    const breakdownRows = buildFleetPnlDetailRows(summary, transports, fleet);
    const footerTotal = breakdownRows.reduce((sum, row) => sum + row.pnl, 0);
    const soldProfit = 8000 * 150 - (8000 * 100 + 8000 * 10 + 8000 * 5);
    assert.equal(summary.pnl, soldProfit);
    assert.equal(
      summary.pnl,
      sumOrderBreakdownPnl(transports, summary.priceBought, summary.loadingCostPerLitre, fleet, false)
    );
    assert.equal(summary.pnl, footerTotal);
    assert.ok(summary.pnl > 0);
    assert.notEqual(summary.pnl, summary.amountSoldRev - summary.totalCost);
    assert.equal(
      breakdownRows.some((row) => row.id.startsWith("remainder-")),
      false
    );
    assert.equal(summary.qtyBalance, 2000);
  });

  it("an order with nothing sold is not a full purchase loss", () => {
    const fleet = defaultFleetSettings();
    const order = {
      ...baseOrder,
      transports: [{ ...baseOrder.transports[0], deliveries: [] }],
    };
    const { summary } = calculateOrderPnlSummary(order, { fleet });
    assert.equal(summary.amountSoldRev, 0);
    assert.equal(summary.totalAmountSoldQty, 0);
    assert.equal(summary.pnl, -(5 * 10000));
    assert.ok(summary.pnl > summary.amountSoldRev - summary.totalCost);
  });
});
