import { z } from "zod";
import { PRODUCT_LOSS_TYPE_VALUES, type ProductLossType } from "@/lib/fleet/loss-types";

export const DEFAULT_COMPANY_LOSS_TYPES: ProductLossType[] = ["ACCIDENT"];

export const fleetSettingsSchema = z.object({
  shortageDeductionBasis: z
    .enum(["LANDED_COST", "TRANSPORT_RATE", "SELLING_PRICE"])
    .default("LANDED_COST"),
  companyLossTypes: z
    .array(z.enum(PRODUCT_LOSS_TYPE_VALUES))
    .default([...DEFAULT_COMPANY_LOSS_TYPES]),
  defaultSupplierShortageParty: z.enum(["TRANSPORTER", "SUPPLIER"]).default("TRANSPORTER"),
  requireSupplierTypeForOrders: z.boolean().default(false),
  useAttributionPnL: z.boolean().default(false),
});

export type FleetSettings = z.infer<typeof fleetSettingsSchema>;

export const defaultFleetSettings = (): FleetSettings =>
  fleetSettingsSchema.parse({});
