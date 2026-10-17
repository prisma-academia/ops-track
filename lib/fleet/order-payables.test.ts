import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { orderPaymentBalance, orderTotalPayable } from "@/lib/fleet/order-payables";

describe("order-payables", () => {
  const baseOrder = {
    pricePerLitre: 100,
    loadingCostPerLitre: 10,
    litersOrdered: 10_000,
    paymentPaid: 0,
  };

  it("orderTotalPayable uses full ordered volume when no supplier shortage credit", () => {
    const total = orderTotalPayable(baseOrder);
    assert.equal(total, 10_000 * 110);
  });

  it("orderTotalPayable reduces billable litres by supplierShortageLiters (local supplier credit)", () => {
    const total = orderTotalPayable({
      ...baseOrder,
      supplierShortageLiters: 500,
    });
    assert.equal(total, 9_500 * 110);
  });

  it("orderPaymentBalance reflects payable minus paid", () => {
    const balance = orderPaymentBalance({
      ...baseOrder,
      supplierShortageLiters: 200,
      paymentPaid: 500_000,
    });
    assert.equal(balance, 9_800 * 110 - 500_000);
  });
});
