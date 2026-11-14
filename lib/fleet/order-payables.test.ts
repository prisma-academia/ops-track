import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  orderBillableLiters,
  orderPaymentBalance,
  orderTotalPayable,
} from "@/lib/fleet/order-payables";

describe("order-payables", () => {
  const baseOrder = {
    pricePerLitre: 100,
    loadingCostPerLitre: 10,
    litersOrdered: 10_000,
    paymentPaid: 0,
  };

  it("orderTotalPayable uses full ordered volume for depot when no receipt context", () => {
    const total = orderTotalPayable({
      ...baseOrder,
      supplierType: "DEPOT",
    });
    assert.equal(total, 10_000 * 110);
  });

  it("local with receipts bills received litres, not ordered minus shortage", () => {
    const billable = orderBillableLiters({
      litersOrdered: 10_000,
      supplierType: "LOCAL",
      transports: [
        {
          deliveries: [{ litersReceived: 4_800 }, { litersReceived: 4_700 }],
        },
      ],
    });
    assert.equal(billable, 9_500);

    const total = orderTotalPayable({
      ...baseOrder,
      supplierType: "LOCAL",
      supplierShortageLiters: 500,
      transports: [
        {
          deliveries: [{ litersReceived: 4_800 }, { litersReceived: 4_700 }],
        },
      ],
    });
    assert.equal(total, 9_500 * 110);
  });

  it("local with no receipts yet bills full ordered volume", () => {
    const billable = orderBillableLiters({
      litersOrdered: 10_000,
      supplierType: "LOCAL",
      transports: [{ deliveries: [{ litersReceived: null }] }],
    });
    assert.equal(billable, 10_000);
  });

  it("depot ignores supplierShortageLiters for payable", () => {
    const total = orderTotalPayable({
      ...baseOrder,
      supplierType: "DEPOT",
      supplierShortageLiters: 2_000,
    });
    assert.equal(total, 10_000 * 110);
  });

  it("orderPaymentBalance reflects payable minus paid", () => {
    const balance = orderPaymentBalance({
      ...baseOrder,
      supplierType: "LOCAL",
      supplierShortageLiters: 200,
      paymentPaid: 500_000,
      transports: [
        {
          deliveries: [{ litersReceived: 9_800 }],
        },
      ],
    });
    assert.equal(balance, 9_800 * 110 - 500_000);
  });
});