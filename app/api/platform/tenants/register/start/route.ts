import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { validatePolicy } from "@/lib/auth/password";
import { issueOtp } from "@/lib/auth/otp";
import { isValidSlug, RESERVED_SLUGS } from "@/lib/auth/context";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";

const QUARANTINE_DAYS = 90;

export const PlatformRegisterBody = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  otherName: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.email("Invalid email address"),
  password: z.string().min(12, "Password must be at least 12 characters"),

  // Company details
  name: z.string().min(1, "Company name is required").max(200),
  slug: z.string().min(3, "Slug must be at least 3 characters").max(32).regex(/^[a-z0-9-]+$/, "Lowercase letters, digits, hyphens only."),
  companyEmail: z.email().optional().or(z.literal("")),
  companyPhone: z.string().max(40).optional().or(z.literal("")),
  website: z.string().max(200).optional().or(z.literal("")),
  addressLine1: z.string().max(200).optional().or(z.literal("")),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  region: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(40).optional().or(z.literal("")),
  country: z.string().max(2).optional().or(z.literal("")),

  // Platform admin configuration
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
  enableTrial: z.boolean().default(true),
  trialDays: z.coerce.number().int().min(0).max(365).default(14),
  activeModules: z.array(z.string()).default(["FLEET", "STATION"]),
  mustChangePassword: z.boolean().default(false),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);

    const body = PlatformRegisterBody.parse(await request.json());

    const policy = validatePolicy(body.password);
    if (!policy.ok) throw new DomainError(400, "weak_password", policy.reason);

    if (!isValidSlug(body.slug) || RESERVED_SLUGS.has(body.slug)) {
      throw new DomainError(400, "invalid_slug", "Slug is reserved or invalid.");
    }

    const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (existing) {
      if (existing.status === "ARCHIVED" && existing.archivedAt) {
        const cutoff = new Date(existing.archivedAt.getTime() + QUARANTINE_DAYS * 24 * 60 * 60 * 1000);
        if (Date.now() < cutoff.getTime()) {
          throw new DomainError(409, "slug_quarantined", "Slug is quarantined.");
        }
      } else {
        throw new DomainError(409, "slug_taken", "Slug already in use.");
      }
    }

    const result = await issueOtp({
      identifier: body.email.toLowerCase(),
      purpose: "TENANT_REGISTRATION",
      tenantId: null,
      tenantName: body.name,
      emailVariant: "registration",
    });

    if (!result.sent) {
      throw new DomainError(429, "rate_limited", "Too many verification requests. Please try again later.");
    }

    return ok({
      otpSent: true,
      otpCode: result.code,
    });
  } catch (e) {
    return handleError(e);
  }
}
