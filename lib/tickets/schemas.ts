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
  "EXPENSE_REQUEST",
  "EXPENSE_VERIFY",
  "INCIDENT_REPORT",
  "OTHER",
]);

export const SpendIntentSchema = z.enum(["NONE", "REQUEST", "ALREADY_PAID"]);

export const AlreadyPaidSchema = z.object({
  paymentMethod: PaymentMethodSchema,
  receiptUrl: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
});

export const CreateTicketBodySchema = z.object({
  stationId: z.string().min(1).optional(),
  category: CreateTicketCategorySchema,
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1),
  requestedAmount: z.coerce.number().positive().optional(),
  requestedCategory: ExpenseCategorySchema.optional(),
  spendIntent: SpendIntentSchema.optional(),
  evidenceUrls: z.array(z.string()).optional(),
  clientId: z.string().optional(),
  parentTicketId: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  pumpId: z.string().optional(),
  nozzleId: z.string().optional(),
  alreadyPaid: AlreadyPaidSchema.optional(),
});

export const ResolveTicketSchema = z.object({
  remark: z.string().min(1, "Remark is required"),
  action: z.enum(["APPROVE", "REJECT", "RESOLVE"]).default("APPROVE"),
  approvedAmount: z.coerce.number().positive().optional(),
});

export const PayoutTicketSchema = z.object({
  paymentMethod: PaymentMethodSchema,
  bankAccountId: z.string().nullable().optional(),
  amount: z.coerce.number().positive().optional(),
  receiptUrl: z.string().nullable().optional(),
  description: z.string().optional(),
});

export const RequestIncreaseSchema = z.object({
  newRequestedAmount: z.coerce.number().positive(),
  reason: z.string().min(1),
});

export const AttachSpendSchema = z.object({
  spendIntent: z.enum(["REQUEST", "ALREADY_PAID"]),
  requestedAmount: z.coerce.number().positive(),
  requestedCategory: ExpenseCategorySchema,
  description: z.string().min(1),
  evidenceUrls: z.array(z.string()).optional(),
  clientId: z.string().optional(),
  alreadyPaid: AlreadyPaidSchema.optional(),
});
