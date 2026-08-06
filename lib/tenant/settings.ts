import { z } from "zod";

/**
 * Typed schema for `Tenant.settingsJson` (PRD §5.8). Stored in the existing
 * JSON column — no migration. Reads never throw: unknown/legacy shapes fall
 * back to defaults and unknown keys are stripped.
 */

export const MODULE_KEYS = [
  "users",
  "clients",
  "roles",
  "templates",
  "activity",
  "stations",
  "operations",
  "tickets",
  "customers",
  "fleet",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const tenantSettingsSchema = z.object({
  logoKey: z.string().min(1).max(300).optional(),
  backgroundKey: z.string().min(1).max(300).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #1e293b")
    .default("#0f172a"),
  timezone: z.string().min(1).max(64).default("UTC"),
  locale: z.string().min(2).max(10).default("en"),
  currency: z.string().length(3).default("USD"),
  enabledModules: z
    .array(z.enum(MODULE_KEYS))
    .default([...MODULE_KEYS]),
  varianceThreshold: z.number().min(0).default(0),
  blockOnUnresolvedVariance: z.boolean().default(false),
});

export type TenantSettings = z.infer<typeof tenantSettingsSchema>;

/** Parse stored settings, applying defaults and never throwing. */
export function parseTenantSettings(json: unknown): TenantSettings {
  const result = tenantSettingsSchema.safeParse(
    json && typeof json === "object" ? json : {}
  );
  if (result.success) return result.data;
  // Legacy / malformed: return schema defaults.
  return tenantSettingsSchema.parse({});
}
