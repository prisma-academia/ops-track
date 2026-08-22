import { z } from "zod";
import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { getChannelSettings, upsertChannelSettings } from "@/lib/notifications/dispatch";
import { notificationPermission } from "@/lib/notifications/permissions";

const ModuleSchema = z.enum(["STATION", "FLEET"]);
const ChannelSchema = z.enum(["SMS", "EMAIL", "MESSAGE", "IN_APP"]);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const module = ModuleSchema.parse(url.searchParams.get("module") ?? "STATION");
    const actor = await requireTenantActor(notificationPermission(module, false), module);
    const settings = await getChannelSettings(actor.tenantId, module);
    return ok({ settings });
  } catch (e) {
    return handleError(e);
  }
}

const PatchSchema = z.object({
  module: ModuleSchema,
  channels: z.array(z.object({
    channel: ChannelSchema,
    enabled: z.boolean(),
  })).min(1),
});

export async function PATCH(request: Request) {
  try {
    await requireCsrf(request);
    const body = PatchSchema.parse(await request.json());
    const actor = await requireTenantActor(notificationPermission(body.module, true), body.module);
    const settings = await upsertChannelSettings(actor.tenantId, body.module, body.channels);
    return ok({ settings });
  } catch (e) {
    return handleError(e);
  }
}
