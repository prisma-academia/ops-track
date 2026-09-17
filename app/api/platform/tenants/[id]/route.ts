import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { revokeAllSessionsForTenant } from "@/lib/auth/session";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parseTenantSettings } from "@/lib/tenant/settings";
import type { AppModule } from "@/lib/generated/prisma/client";

const Body = z.discriminatedUnion("action", [
  // Existing lifecycle actions
  z.object({ action: z.enum(["suspend", "archive", "restore"]) }),
  z.object({
    action: z.literal("toggle_module"),
    module: z.enum(["STATION", "FLEET"]),
    enabled: z.boolean(),
  }),

  // Trial controls
  z.object({
    action: z.literal("set_trial"),
    trialDays: z.number().int().min(1).max(365),
    trialStartedAt: z.string().datetime().optional(), // ISO string; defaults to now if not set
    trialEndsAt: z.string().datetime().optional(),    // override computed end date
  }),
  z.object({
    action: z.literal("extend_trial"),
    days: z.number().int().min(1).max(365),
  }),

  // Platform-controlled capacity limits + feature gates (settingsJson patch)
  z.object({
    action: z.literal("set_settings"),
    patch: z.object({
      maxUsers:           z.number().int().min(1).optional(),
      maxStations:        z.number().int().min(1).optional(),
      maxOrganizations:   z.number().int().min(1).optional(),
      allowClientPortal:  z.boolean().optional(),
      allowApiAccess:     z.boolean().optional(),
      maintenanceMode:    z.boolean().optional(),
      maintenanceMessage: z.string().max(500).optional(),
    }),
  }),

  // Internal notes
  z.object({
    action: z.literal("set_notes"),
    notes: z.string().max(5000),
  }),
]);

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const { id } = await ctx.params;
    const payload = Body.parse(await request.json());
    const { action } = payload;
    const meta = requestMeta(request);

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    let updated = tenant;

    // ── toggle_module ──────────────────────────────────────────────────────
    if (action === "toggle_module") {
      const module = payload.module as AppModule;
      const activeModules = new Set(tenant.activeModules);
      if (payload.enabled) activeModules.add(module);
      else activeModules.delete(module);

      updated = await prisma.$transaction(async (tx) => {
        const next = await tx.tenant.update({
          where: { id },
          data: { activeModules: Array.from(activeModules) },
        });
        await tx.tenantModule.upsert({
          where: { tenantId_module: { tenantId: id, module } },
          create: {
            tenantId: id,
            module,
            status: payload.enabled ? "ACTIVE" : "SUSPENDED",
          },
          update: { status: payload.enabled ? "ACTIVE" : "SUSPENDED" },
        });
        return next;
      });

    // ── set_trial ──────────────────────────────────────────────────────────
    } else if (action === "set_trial") {
      const startedAt = payload.trialStartedAt
        ? new Date(payload.trialStartedAt)
        : (tenant.trialStartedAt ?? new Date());

      const endsAt = payload.trialEndsAt
        ? new Date(payload.trialEndsAt)
        : new Date(startedAt.getTime() + payload.trialDays * 24 * 60 * 60 * 1000);

      updated = await prisma.tenant.update({
        where: { id },
        data: {
          trialDays: payload.trialDays,
          trialStartedAt: startedAt,
          trialEndsAt: endsAt,
        },
      });

    // ── extend_trial ───────────────────────────────────────────────────────
    } else if (action === "extend_trial") {
      const base = tenant.trialEndsAt ?? new Date();
      const newEnd = new Date(base.getTime() + payload.days * 24 * 60 * 60 * 1000);

      updated = await prisma.tenant.update({
        where: { id },
        data: {
          trialEndsAt: newEnd,
          trialExtensions: { increment: 1 },
        },
      });

    // ── set_settings ───────────────────────────────────────────────────────
    } else if (action === "set_settings") {
      const current = parseTenantSettings(tenant.settingsJson);
      const next = { ...current, ...payload.patch };
      updated = await prisma.tenant.update({
        where: { id },
        data: { settingsJson: next as object },
      });

    // ── set_notes ──────────────────────────────────────────────────────────
    } else if (action === "set_notes") {
      updated = await prisma.tenant.update({
        where: { id },
        data: { notes: payload.notes },
      });

    // ── lifecycle: suspend / archive / restore ─────────────────────────────
    } else {
      const next =
        action === "suspend"
          ? { status: "SUSPENDED" as const, archivedAt: null }
          : action === "archive"
            ? { status: "ARCHIVED" as const, archivedAt: new Date() }
            : { status: "ACTIVE" as const, archivedAt: null };
      updated = await prisma.tenant.update({ where: { id }, data: next });
      if (action === "suspend" || action === "archive") {
        await revokeAllSessionsForTenant(id);
      }
    }

    await audit({
      actorType: "PLATFORM_USER",
      actorId: actor.userId,
      action: `tenant.${action}`,
      tenantId: id,
      targetType: "Tenant",
      targetId: id,
      before: action === "toggle_module" ? { activeModules: tenant.activeModules } : { status: tenant.status },
      after:  action === "toggle_module" ? { activeModules: updated.activeModules } : { status: updated.status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ tenant: updated });
  } catch (e) {
    return handleError(e);
  }
}

