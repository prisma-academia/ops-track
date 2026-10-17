import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { defaultFleetSettings } from "@/lib/fleet/fleet-settings";
import {
  classifyLossLogEconomicImpact,
  resolveShortageParty,
  sumCompanyLossAmount,
} from "@/lib/fleet/loss-attribution";

describe("loss-attribution", () => {
  const fleet = defaultFleetSettings();

  it("resolveShortageParty maps supplier types", () => {
    assert.equal(resolveShortageParty("LOCAL"), "SUPPLIER");
    assert.equal(resolveShortageParty("DEPOT"), "TRANSPORTER");
    assert.equal(resolveShortageParty(null), "UNCONFIGURED");
  });

  it("SHORTAGE logs are transporter recovery by default", () => {
    const impact = classifyLossLogEconomicImpact(
      { lossType: "SHORTAGE", lostQuantity: 10, expensesIncurred: 0 },
      fleet
    );
    assert.equal(impact, "TRANSPORTER_RECOVERY");
  });

  it("ACCIDENT logs count as company P&L", () => {
    const impact = classifyLossLogEconomicImpact(
      { lossType: "ACCIDENT", lostQuantity: 5, expensesIncurred: 100 },
      fleet
    );
    assert.equal(impact, "COMPANY_PNL");
  });

  it("THEFT logs are informational unless enabled in fleet settings", () => {
    const impact = classifyLossLogEconomicImpact(
      { lossType: "THEFT", lostQuantity: 5, expensesIncurred: 0 },
      fleet
    );
    assert.equal(impact, "INFORMATIONAL");
    const fleetWithTheft = {
      ...fleet,
      companyLossTypes: [...fleet.companyLossTypes, "THEFT" as const],
    };
    const impactTheft = classifyLossLogEconomicImpact(
      { lossType: "THEFT", lostQuantity: 5, expensesIncurred: 0 },
      fleetWithTheft
    );
    assert.equal(impactTheft, "COMPANY_PNL");
  });

  it("default fleet settings absorb only ACCIDENT", () => {
    assert.deepEqual(fleet.companyLossTypes, ["ACCIDENT"]);
  });

  it("sumCompanyLossAmount excludes shortage", () => {
    const order = { pricePerLitre: 100, loadingCostPerLitre: 10 };
    const total = sumCompanyLossAmount(
      [
        { lossType: "SHORTAGE", lostQuantity: 20, expensesIncurred: 0 },
        { lossType: "ACCIDENT", lostQuantity: 2, expensesIncurred: 50 },
      ],
      order,
      fleet
    );
    assert.equal(total, 2 * 110 + 50);
  });
});
