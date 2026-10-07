"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Mail, MessageSquare, Monitor, Plus, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatHumanReadableDate } from "@/lib/utils";

type Channel = "SMS" | "EMAIL" | "MESSAGE" | "IN_APP";
type AudienceType = "ALL_MODULE_USERS" | "STATION" | "ORGANIZATION" | "USERS";
type AppModule = "STATION" | "FLEET";
type ChannelSetting = { channel: Channel; enabled: boolean };

const CHANNEL_META: {
  id: Channel;
  label: string;
  short: string;
  hint: string;
  icon: typeof Mail;
}[] = [
  { id: "IN_APP", label: "In-App", short: "In-app", hint: "Inbox and push notification", icon: Monitor },
  { id: "EMAIL", label: "Email", short: "Email", hint: "Send to the user's email address", icon: Mail },
  { id: "SMS", label: "SMS", short: "SMS", hint: "Send to the user's phone number", icon: Smartphone },
  { id: "MESSAGE", label: "Message", short: "Message", hint: "WhatsApp-style text", icon: MessageSquare },
];

const AUDIENCE_LABELS: Record<AudienceType, string> = {
  ALL_MODULE_USERS: "All users",
  STATION: "Stations",
  ORGANIZATION: "Organizations",
  USERS: "Specific users",
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  channels: Channel[];
  audienceType: AudienceType;
  status: "DRAFT" | "SENT";
  createdAt: string;
  sentAt: string | null;
  createdBy?: { firstName?: string | null; lastName?: string | null; email: string };
  _count?: { deliveries: number };
};

function settingsKey(rows: ChannelSetting[]) {
  return [...rows]
    .sort((a, b) => a.channel.localeCompare(b.channel))
    .map((row) => `${row.channel}:${row.enabled ? 1 : 0}`)
    .join("|");
}

export function NotificationsManager({
  module,
  settings: initialSettings,
  messages,
  users,
  stations = [],
  organizations = [],
}: {
  module: AppModule;
  settings: ChannelSetting[];
  messages: NotificationRow[];
  users: { id: string; firstName?: string | null; lastName?: string | null; email: string }[];
  stations?: { id: string; name: string; code: string }[];
  organizations?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const moduleLabel = module === "FLEET" ? "fleet" : "station";
  const [settings, setSettings] = useState(initialSettings);
  const [savedKey, setSavedKey] = useState(() => settingsKey(initialSettings));
  const [composeOpen, setComposeOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<Channel[]>(
    initialSettings.filter((s) => s.enabled).map((s) => s.channel),
  );
  const [audienceType, setAudienceType] = useState<AudienceType>("ALL_MODULE_USERS");
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sending, setSending] = useState(false);

  const dirty = settingsKey(settings) !== savedKey;
  const selectableChannels = useMemo(
    () => new Set(settings.filter((row) => row.enabled).map((row) => row.channel)),
    [settings],
  );

  const audienceOptions =
    audienceType === "STATION"
      ? stations.map((s) => ({ id: s.id, label: `${s.name} (${s.code})` }))
      : audienceType === "ORGANIZATION"
        ? organizations.map((o) => ({ id: o.id, label: o.name }))
        : users.map((u) => ({
            id: u.id,
            label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
          }));

  function toggleDraftChannel(channel: Channel, enabled: boolean) {
    setSettings((prev) => prev.map((row) => (row.channel === channel ? { ...row, enabled } : row)));
    if (!enabled) setChannels((prev) => prev.filter((item) => item !== channel));
    if (enabled) setChannels((prev) => (prev.includes(channel) ? prev : [...prev, channel]));
  }

  function toggleComposeChannel(channel: Channel, checked: boolean) {
    setChannels((prev) => (checked ? Array.from(new Set([...prev, channel])) : prev.filter((c) => c !== channel)));
  }

  function toggleAudience(id: string, checked: boolean) {
    setAudienceIds((prev) => (checked ? [...prev, id] : prev.filter((value) => value !== id)));
  }

  async function saveSettings() {
    setSavingSettings(true);
    setError(null);
    const res = await apiPatch<{ settings: ChannelSetting[] }>("/api/tenant/notifications/settings", {
      module,
      channels: settings,
    });
    setSavingSettings(false);
    if (res.error) {
      setError(res.error.message);
      toast.error(res.error.message);
      return;
    }
    const updated = res.data?.settings ?? settings;
    setSettings(updated);
    setSavedKey(settingsKey(updated));
    setChannels((prev) => prev.filter((channel) => updated.find((row) => row.channel === channel)?.enabled));
    toast.success("Notification preferences saved.");
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and a message.");
      return;
    }
    const active = channels.filter((channel) => selectableChannels.has(channel));
    if (active.length === 0) {
      toast.error("Choose at least one enabled channel.");
      return;
    }
    if (audienceType !== "ALL_MODULE_USERS" && audienceIds.length === 0) {
      toast.error("Select at least one recipient.");
      return;
    }
    if (dirty) {
      toast.error("Save channel preferences before sending.");
      return;
    }

    setSending(true);
    setError(null);
    const res = await apiPost("/api/tenant/notifications", {
      module,
      title,
      body,
      channels: active,
      audienceType,
      audienceIds,
      send: true,
    });
    setSending(false);
    if (res.error) {
      setError(res.error.message);
      toast.error(res.error.message);
      return;
    }
    toast.success("Notification sent.");
    setComposeOpen(false);
    setTitle("");
    setBody("");
    setAudienceIds([]);
    setAudienceType("ALL_MODULE_USERS");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Decide which channels are available, then send a notice to the people who should see it.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => setComposeOpen(true)}>
            <Plus className="size-4" />
            Add notification
          </Button>
          <Button className="rounded-full" onClick={saveSettings} disabled={!dirty || savingSettings}>
            {savingSettings ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}

      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-xs sm:p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/60 text-foreground">
            <Bell className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Notification Channels</h2>
            <p className="text-sm text-muted-foreground">
              Select the channels you want to use for sending notifications.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {CHANNEL_META.map((item) => {
            const enabled = settings.find((row) => row.channel === item.id)?.enabled ?? true;
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50">
                    <Icon className="size-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
                <Switch
                  checked={enabled}
                  disabled={savingSettings}
                  onCheckedChange={(checked) => toggleDraftChannel(item.id, checked)}
                  aria-label={`${item.label} channel`}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs">
        <div className="flex items-start gap-3 border-b border-border/60 px-4 py-4 sm:px-5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/60 text-foreground">
            <Bell className="size-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sent notifications</h2>
            <p className="text-sm text-muted-foreground">
              Notices already composed for {moduleLabel} users.
            </p>
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(0,1.6fr)_repeat(4,4.5rem)_8rem_5.5rem] items-center gap-3 border-b border-border/50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
          <span>Notification</span>
          {CHANNEL_META.map((item) => (
            <span key={item.id} className="text-center">
              {item.short}
            </span>
          ))}
          <span>Audience</span>
          <span className="text-right">Status</span>
        </div>

        {messages.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium text-foreground">No notifications yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add a notification to reach {moduleLabel} users.</p>
            <Button className="mt-4 rounded-full" onClick={() => setComposeOpen(true)}>
              <Plus className="size-4" />
              Add notification
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {messages.map((message) => (
              <li
                key={message.id}
                className="grid grid-cols-1 items-center gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,4.5rem)_8rem_5.5rem]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/50">
                    <Bell className="size-4 text-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{message.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{message.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground lg:hidden">
                      {AUDIENCE_LABELS[message.audienceType] || message.audienceType}
                      {" · "}
                      {message._count?.deliveries ?? 0} deliveries
                      {message.sentAt ? ` · ${formatHumanReadableDate(message.sentAt)}` : ""}
                    </p>
                  </div>
                </div>
                {CHANNEL_META.map((item) => {
                  const used = message.channels.includes(item.id);
                  return (
                    <div key={item.id} className="hidden justify-center lg:flex">
                      <span
                        className={cn(
                          "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[10px] font-semibold",
                          used
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground/50",
                        )}
                      >
                        {used ? "On" : "—"}
                      </span>
                    </div>
                  );
                })}
                <div className="hidden text-sm text-muted-foreground lg:block">
                  {AUDIENCE_LABELS[message.audienceType] || message.audienceType}
                </div>
                <div className="hidden justify-end lg:flex">
                  <Badge variant={message.status === "SENT" ? "default" : "outline"}>{message.status}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:hidden">
                  {message.channels.map((channel) => (
                    <Badge key={channel} variant="secondary">
                      {CHANNEL_META.find((item) => item.id === channel)?.short || channel}
                    </Badge>
                  ))}
                  <Badge variant={message.status === "SENT" ? "default" : "outline"}>{message.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add notification</DialogTitle>
            <DialogDescription>
              Write the notice, choose who should receive it, and pick the channels to use.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="n_title">Title</Label>
              <Input
                id="n_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Evening dip reminder"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n_body">Message</Label>
              <Textarea
                id="n_body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="Write the notice…"
              />
            </div>

            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="grid grid-cols-2 gap-2">
                {CHANNEL_META.map((item) => {
                  const enabled = selectableChannels.has(item.id);
                  const Icon = item.icon;
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                        enabled ? "cursor-pointer hover:bg-muted/40" : "cursor-not-allowed opacity-50",
                      )}
                    >
                      <Checkbox
                        checked={enabled && channels.includes(item.id)}
                        disabled={!enabled}
                        onCheckedChange={(checked) => toggleComposeChannel(item.id, checked === true)}
                      />
                      <Icon className="size-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
              {dirty && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Save channel preferences before sending.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={audienceType}
                onValueChange={(value) => {
                  setAudienceType(value as AudienceType);
                  setAudienceIds([]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_MODULE_USERS">All {moduleLabel} users</SelectItem>
                  {module === "STATION" && <SelectItem value="STATION">Specific stations</SelectItem>}
                  {module === "FLEET" && <SelectItem value="ORGANIZATION">Specific organizations</SelectItem>}
                  <SelectItem value="USERS">Specific users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audienceType === "ALL_MODULE_USERS" ? (
              <p className="rounded-lg border bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                Every active {moduleLabel} user will receive this message.
              </p>
            ) : (
              <div className="max-h-48 divide-y overflow-y-auto rounded-lg border">
                {audienceOptions.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No targets available.</p>
                ) : (
                  audienceOptions.map((option) => (
                    <label key={option.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Checkbox
                        checked={audienceIds.includes(option.id)}
                        onCheckedChange={(checked) => toggleAudience(option.id, checked === true)}
                      />
                      {option.label}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || dirty}>
              {sending ? "Sending…" : "Send notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
