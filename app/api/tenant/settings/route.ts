import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { tenantSettingsSchema, parseTenantSettings } from "@/lib/tenant/settings";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

const PatchBody = z.object({
  name: z.string().min(1).max(200).optional(),
  companyEmail: z.string().email().max(255).optional().nullable(),
  companyPhone: z.string().max(100).optional().nullable(),
  website: z.string().url().max(255).optional().nullable().or(z.literal("")),
  addressLine1: z.string().max(255).optional().nullable(),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable(),
  postalCode: z.string().max(50).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  settings: tenantSettingsSchema.partial().optional(),
});

function withUrls(settings: ReturnType<typeof parseTenantSettings>) {
  return {
    ...settings,
    logoUrl:
      settings.logoKey && s3Configured() ? publicUrlForKey(settings.logoKey) : null,
    backgroundUrl:
      settings.backgroundKey && s3Configured() ? publicUrlForKey(settings.backgroundKey) : null,
  };
}

export async function GET() {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SETTINGS_READ.key);
    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");
    const settings = parseTenantSettings(tenant.settingsJson);
    return ok({
      tenant: { 
        id: tenant.id, 
        name: tenant.name, 
        slug: tenant.slug,
        companyEmail: tenant.companyEmail,
        companyPhone: tenant.companyPhone,
        website: tenant.website,
        addressLine1: tenant.addressLine1,
        addressLine2: tenant.addressLine2,
        city: tenant.city,
        region: tenant.region,
        postalCode: tenant.postalCode,
        country: tenant.country,
      },
      settings: withUrls(settings),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SETTINGS_WRITE.key);
    const body = PatchBody.parse(await request.json());
    const meta = requestMeta(request);

    const before = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!before) throw new DomainError(404, "not_found", "Tenant not found.");

    const current = parseTenantSettings(before.settingsJson);
    // Merge patch over current, then re-validate the full object.
    const merged = tenantSettingsSchema.parse({
      ...current,
      ...(body.settings ?? {}),
    });

    const updated = await prisma.tenant.update({
      where: { id: actor.tenantId },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.companyEmail !== undefined ? { companyEmail: body.companyEmail } : {}),
        ...(body.companyPhone !== undefined ? { companyPhone: body.companyPhone } : {}),
        ...(body.website !== undefined ? { website: body.website === "" ? null : body.website } : {}),
        ...(body.addressLine1 !== undefined ? { addressLine1: body.addressLine1 } : {}),
        ...(body.addressLine2 !== undefined ? { addressLine2: body.addressLine2 } : {}),
        ...(body.city !== undefined ? { city: body.city } : {}),
        ...(body.region !== undefined ? { region: body.region } : {}),
        ...(body.postalCode !== undefined ? { postalCode: body.postalCode } : {}),
        ...(body.country !== undefined ? { country: body.country } : {}),
        settingsJson: merged as object,
      },
    });
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant.update_settings",
      tenantId: actor.tenantId,
      targetType: "Tenant",
      targetId: actor.tenantId,
      before: { name: before.name, settingsJson: current } as object,
      after: { name: updated.name, settingsJson: merged } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return ok({
      tenant: { 
        id: updated.id, 
        name: updated.name, 
        slug: updated.slug,
        companyEmail: updated.companyEmail,
        companyPhone: updated.companyPhone,
        website: updated.website,
        addressLine1: updated.addressLine1,
        addressLine2: updated.addressLine2,
        city: updated.city,
        region: updated.region,
        postalCode: updated.postalCode,
        country: updated.country,
      },
      settings: withUrls(merged),
    });
  } catch (e) {
    return handleError(e);
  }
}
