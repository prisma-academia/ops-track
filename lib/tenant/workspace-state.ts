import { parseTenantSettings, type TenantSettings } from "@/lib/tenant/settings";

export type WorkspaceNotice = {
  tone: "warning" | "danger" | "info";
  title: string;
  body: string;
  /** ISO timestamp. When set, the banner shows a live countdown on the right. */
  endsAt?: string;
};

export function trialWorkspaceNotice(input: {
  trialEndsAt: Date | string | null;
  hasActiveSubscription: boolean;
}): WorkspaceNotice | null {
  if (!input.trialEndsAt || input.hasActiveSubscription) return null;
  const ends = input.trialEndsAt instanceof Date ? input.trialEndsAt : new Date(input.trialEndsAt);
  if (Number.isNaN(ends.getTime())) return null;

  const daysLeft = Math.ceil((ends.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const endsLabel = ends.toLocaleDateString();

  if (daysLeft < 0) {
    return {
      tone: "danger",
      title: "Trial ended",
      body: `The free trial ended on ${endsLabel}. Contact OpsTrack to keep this workspace open.`,
    };
  }

  return {
    tone: daysLeft <= 5 ? "warning" : "info",
    title: "Free trial",
    body: `Ends ${endsLabel}.`,
    endsAt: ends.toISOString(),
  };
}

export function maintenanceWorkspaceNotice(settings: TenantSettings): WorkspaceNotice | null {
  if (!settings.maintenanceMode) return null;
  return {
    tone: "danger",
    title: "Under maintenance",
    body: settings.maintenanceMessage || "This workspace is temporarily unavailable.",
  };
}

export function portalWorkspaceNotice(settings: TenantSettings): WorkspaceNotice | null {
  if (settings.allowClientPortal) return null;
  return {
    tone: "warning",
    title: "Client portal off",
    body: "Client sign-in and the client area are closed until this is turned back on.",
  };
}

export function apiAccessWorkspaceNotice(settings: TenantSettings): WorkspaceNotice | null {
  if (!settings.allowApiAccess) return null;
  return {
    tone: "info",
    title: "API access on",
    body: "This workspace is allowed to use API access.",
  };
}

export function tenantWorkspaceNotices(input: {
  settingsJson: unknown;
  trialEndsAt: Date | string | null;
  hasActiveSubscription: boolean;
}): WorkspaceNotice[] {
  const settings = parseTenantSettings(input.settingsJson);
  return [
    maintenanceWorkspaceNotice(settings),
    trialWorkspaceNotice({
      trialEndsAt: input.trialEndsAt,
      hasActiveSubscription: input.hasActiveSubscription,
    }),
    portalWorkspaceNotice(settings),
    apiAccessWorkspaceNotice(settings),
  ].filter((notice): notice is WorkspaceNotice => notice !== null);
}
