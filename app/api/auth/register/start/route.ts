import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { validatePolicy } from "@/lib/auth/password";
import { issueOtp } from "@/lib/auth/otp";
import { isValidSlug, RESERVED_SLUGS } from "@/lib/auth/context";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";

const QUARANTINE_DAYS = 90;

export const RegisterBody = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  otherName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  email: z.email(),
  password: z.string().min(12),
  // company
  name: z.string().min(1).max(200),
  slug: z.string().min(3).max(32).regex(/^[a-z0-9-]+$/),
  companyEmail: z.email().optional(),
  companyPhone: z.string().max(40).optional(),
  website: z.string().max(200).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postalCode: z.string().max(40).optional(),
  country: z.string().max(2).optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const body = RegisterBody.parse(await request.json());
    await enforceRateLimit(RATE_PRESETS.REGISTER, [body.email.toLowerCase(), body.slug]);

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
    });
    if (!result.sent) {
      throw new DomainError(429, "rate_limited", "Too many requests. Try again later.");
    }
    return ok({ otpSent: true });
  } catch (e) {
    return handleError(e);
  }
}
