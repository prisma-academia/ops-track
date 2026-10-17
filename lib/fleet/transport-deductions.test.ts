import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultFleetSettings } from "@/lib/fleet/fleet-settings";
import { computeTransporterFeeDeduction } from "@/lib/fleet/transport-deductions";

describe("transport-deductions", () => {
  const fleet = defaultFleetSettings();
  const order = { pricePerLitre: 100, loadingCostPerLitre: 10 };
  const deliveries = [
    {
      litersDespatched: 1000,
      litersReceived: 950,
      litersReturned: 0,
      shortageDeducted: true,
    },
  ];

  it("DEPOT supplier charges delivery shortfall against transporter fee", () => {
    const result = computeTransporterFeeDeduction({
      maintenanceCost: 0,
      ratePerLiter: 5,
      deliveries,
      lossLogs: [],
      supplierType: "DEPOT",
      order,
      fleet,
      sellingPrice: 150,
    });
    assert.equal(result.shortfallCharged, 50);
    assert.equal(result.totalDeduction, 50 * 110);
  });

  it("LOCAL supplier does not charge delivery shortfall to transporter", () => {
    const result = computeTransporterFeeDeduction({
      maintenanceCost: 0,
      ratePerLiter: 5,
      deliveries,
      lossLogs: [],
      supplierType: "LOCAL",
      order,
      fleet,
      sellingPrice: 150,
    });
    assert.equal(result.shortfallCharged, 50);
    assert.equal(result.totalDeduction, 0);
  });
});
