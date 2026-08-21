export const PRODUCT_LOSS_TYPE_VALUES = [
  "THEFT",
  "ACCIDENT",
  "SPILL",
  "LEAKAGE",
  "SHORTAGE",
  "CONTAMINATION",
  "OTHERS",
] as const;

export type ProductLossType = (typeof PRODUCT_LOSS_TYPE_VALUES)[number];

export type LossTypeMeta = {
  value: ProductLossType;
  label: string;
  summary: string;
  guidance: string;
  notesPlaceholder: string;
  notesRequired: boolean;
  expenseLabel: string;
  expenseHint: string;
  terminateHint: string;
};

export const PRODUCT_LOSS_TYPES: LossTypeMeta[] = [
  {
    value: "THEFT",
    label: "Theft",
    summary: "Siphoning, hijacking, or diversion of product",
    guidance:
      "Log the litres stolen or diverted. Note the location, time, and any police report. Recovery or escort costs can be recorded as incident expenses — truck or security-asset repairs belong in Payments & Expenses.",
    notesPlaceholder: "Where and when it happened, how it was discovered, police report number…",
    notesRequired: true,
    expenseLabel: "Recovery / security expenses (₦)",
    expenseHint: "Police, escort, or recovery costs tied to this theft.",
    terminateHint: "Check this only if the entire load is gone and the trip cannot continue.",
  },
  {
    value: "ACCIDENT",
    label: "Accident",
    summary: "Crash, rollover, or roadside incident that lost product",
    guidance:
      "Log the litres spilled or unrecoverable after a crash or rollover. Record cleanup or recovery costs here. If the truck cannot continue, terminate the trip. Vehicle repairs belong in Payments & Expenses, not this log.",
    notesPlaceholder: "Where it happened, what was damaged, how much product was recovered…",
    notesRequired: true,
    expenseLabel: "Cleanup / recovery expenses (₦)",
    expenseHint: "Spill cleanup, towing of product, or environmental recovery — not truck repairs.",
    terminateHint: "Check this if the truck cannot continue after the crash.",
  },
  {
    value: "SPILL",
    label: "Spill",
    summary: "Product released during loading, offloading, or a hose disconnect",
    guidance:
      "Use this for accidental discharge with no crash — loading overflow, hose burst, or valve left open. Log the litres lost and any cleanup cost.",
    notesPlaceholder: "When it spilled (loading, transit, offloading) and what caused it…",
    notesRequired: false,
    expenseLabel: "Cleanup expenses (₦)",
    expenseHint: "Containment, absorbent, or site cleanup costs.",
    terminateHint: "Check this if the remaining load cannot be delivered.",
  },
  {
    value: "LEAKAGE",
    label: "Leakage",
    summary: "Tank, valve, gasket, or compartment leak en route",
    guidance:
      "Use this when product escaped slowly from a faulty seal, valve, or compartment. Log the estimated litres lost between departure and discovery.",
    notesPlaceholder: "Which compartment or fitting leaked, and when it was noticed…",
    notesRequired: false,
    expenseLabel: "Containment / cleanup expenses (₦)",
    expenseHint: "Roadside containment or emergency sealing costs.",
    terminateHint: "Check this if the tank is unsafe to continue with.",
  },
  {
    value: "SHORTAGE",
    label: "Shortage",
    summary: "Unexplained dip shortage versus loaded volume",
    guidance:
      "Use this when destination dip is short and theft, spill, or accident has not been confirmed. Log the missing litres. Do not use this for known delivery variances already recorded on a drop.",
    notesPlaceholder: "Loaded vs dipped figures, where the shortage was found…",
    notesRequired: false,
    expenseLabel: "Related expenses (₦)",
    expenseHint: "Usually ₦0. Add only costs directly tied to investigating this shortage.",
    terminateHint: "Check this if the remaining product cannot be delivered.",
  },
  {
    value: "CONTAMINATION",
    label: "Contamination",
    summary: "Water ingress or mixed product that makes litres unusable",
    guidance:
      "Log the litres that can no longer be sold — water in the tank, mixed grades, or off-spec product. Disposal or flushing costs can be recorded as incident expenses.",
    notesPlaceholder: "What contaminated the product (water, mixed grade) and how it was found…",
    notesRequired: true,
    expenseLabel: "Disposal / flushing expenses (₦)",
    expenseHint: "Offloading, flushing, or disposing of unusable product.",
    terminateHint: "Check this if the remaining load is unusable and the trip cannot continue.",
  },
  {
    value: "OTHERS",
    label: "Other product loss",
    summary: "Fire, seizure, or any other product loss not listed",
    guidance:
      "Use this for fire, government seizure, or any other in-transit product loss. Describe what happened — this type requires notes.",
    notesPlaceholder: "Describe the incident, location, and what happened to the product…",
    notesRequired: true,
    expenseLabel: "Incident expenses (₦)",
    expenseHint: "Costs tied to this product loss. Truck repairs belong in Payments & Expenses.",
    terminateHint: "Check this if the transport cannot proceed.",
  },
];

const PRODUCT_LOSS_TYPE_MAP = Object.fromEntries(
  PRODUCT_LOSS_TYPES.map((type) => [type.value, type])
) as Record<ProductLossType, LossTypeMeta>;

const LEGACY_LOSS_TYPE_LABELS: Record<string, string> = {
  MAINTENANCE: "Maintenance",
};

export function getProductLossType(value: string | null | undefined): LossTypeMeta | undefined {
  if (!value) return undefined;
  return PRODUCT_LOSS_TYPE_MAP[value as ProductLossType];
}

export function getLossTypeLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return getProductLossType(value)?.label ?? LEGACY_LOSS_TYPE_LABELS[value] ?? value;
}

export function isNotesRequiredForLossType(value: string): boolean {
  return getProductLossType(value)?.notesRequired ?? true;
}
