import { z } from "zod";

export const ExpenseCategorySchema = z.enum([
  "FUEL_FOR_GEN",
  "MAINTENANCE",
  "UTILITIES",
  "STATIONERY",
  "OTHER",
]);

export const PaymentMethodSchema = z.enum(["CASH", "POS", "BANK_TRANSFER", "CHEQUE"]);

export const CreateTicketCategorySchema = z.enum([
  "EQUIPMENT_FAULT",
  "CASH_DISCREPANCY",
  "INCIDENT_REPORT",
  "OTHER",
]);

export const CreateTicketBodySchema = z.object({
  stationId: z.string().min(1).optional(),
  category: CreateTicketCategorySchema,
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1),
  evidenceUrls: z.array(z.string()).optional(),
  clientId: z.string().optional(),
  parentTicketId: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  pumpId: z.string().optional(),
  nozzleId: z.string().optional(),
});

export const ResolveTicketSchema = z.object({
  remark: z.string().min(1, "Remark is required"),
  action: z.enum(["APPROVE", "REJECT", "RESOLVE"]).default("APPROVE"),
});
