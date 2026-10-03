import assert from "assert";
import {
  deliveryCommitted,
  deliveryShortfall,
  computeAvailableVolume,
  type VolumeDelivery,
} from "../lib/fleet/transport-volume";

console.log("Running volume & shortfall unit tests...");

// SCENARIO 1: User's exact case with Return to Truck
// 45,000 L carried, 20,000 to A, 25,000 to B.
// A received 20,000 L. B received 24,000 L. Tank full -> 1,000 L returned to truck.
{
  const delA: VolumeDelivery = {
    litersDespatched: 20000,
    litersReceived: 20000,
    litersReturned: 0,
  };
  const delB: VolumeDelivery = {
    litersDespatched: 25000,
    litersReceived: 24000,
    litersReturned: 1000, // Returned to truck
  };

  assert.strictEqual(deliveryCommitted(delA), 20000, "Del A committed should be 20,000");
  assert.strictEqual(deliveryShortfall(delA), 0, "Del A shortfall should be 0");

  assert.strictEqual(deliveryCommitted(delB), 24000, "Del B committed should be 24,000 (25k - 1k returned)");
  assert.strictEqual(deliveryShortfall(delB), 0, "Del B shortfall should be 0 (no driver penalty)");

  const available = computeAvailableVolume({
    litersCarried: 45000,
    deliveries: [delA, delB],
    loggedLost: 0,
  });
  assert.strictEqual(available, 1000, "Truck must have 1,000 L available to dispatch to Station C!");
  console.log("✔ Scenario 1 (Return to Truck & Reassign 1,000 L) passed!");
}

// SCENARIO 2: Same case if NOT returned to truck (actual shortage)
{
  const delA: VolumeDelivery = {
    litersDespatched: 20000,
    litersReceived: 20000,
    litersReturned: 0,
  };
  const delB: VolumeDelivery = {
    litersDespatched: 25000,
    litersReceived: 24000,
    litersReturned: 0, // Not returned to truck
  };

  assert.strictEqual(deliveryCommitted(delB), 25000, "Del B committed is 25,000");
  assert.strictEqual(deliveryShortfall(delB), 1000, "Del B shortfall is 1,000 (charged to driver)");

  const available = computeAvailableVolume({
    litersCarried: 45000,
    deliveries: [delA, delB],
    loggedLost: 0,
  });
  assert.strictEqual(available, 0, "No volume available on truck");
  console.log("✔ Scenario 2 (Loss deduction on shortage) passed!");
}

// SCENARIO 3: Logged Loss tab deduction from tank capacity
{
  const delA: VolumeDelivery = {
    litersDespatched: 20000,
    litersReceived: null, // Still in transit
    litersReturned: 0,
  };
  const loggedLost = 2000; // e.g. 2,000 L leakage logged on tab

  const available = computeAvailableVolume({
    litersCarried: 45000,
    deliveries: [delA],
    loggedLost,
  });
  // 45,000 - 20,000 - 2,000 = 23,000
  assert.strictEqual(available, 23000, "Available must properly deduct the 2,000 L logged loss");
  console.log("✔ Scenario 3 (Loss Log properly deducts from tank capacity) passed!");
}

// SCENARIO 4: Optional client shortage deduction flag
{
  const delClient: VolumeDelivery = {
    litersDespatched: 10000,
    litersReceived: 9500,
    litersReturned: 0,
    shortageDeducted: false, // User chose not to penalize driver
  };
  assert.strictEqual(deliveryShortfall(delClient), 500, "Shortfall is still 500 L physically");
  console.log("✔ Scenario 4 (Optional driver deduction) passed!");
}

console.log("\nALL 4 SCENARIOS TESTED AND PASSED SUCCESSFULLY!");
