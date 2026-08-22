"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Mail, MessageSquare, Phone, Smartphone } from "lucide-react";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Channel = "SMS" | "EMAIL" | "MESSAGE" | "IN_APP";
type AudienceType = "ALL_MODULE_USERS" | "STATION" | "ORGANIZATION" | "USERS";
type AppModule = "STATION" | "FLEET";

const CHANNEL_META: { id: Channel; label: string; hint: string; icon: typeof Phone }[] = [
  { id: "SMS", label: "Phone / SMS", hint: "Send to the user's phone number", icon: Phone },
  { id: "EMAIL", label: "Email", hint: "Send to the user's email address", icon: Mail },
  { id: "MESSAGE", label: "Message", hint: "WhatsApp-style text (provider later)", icon: MessageSquare },
  { id: "IN_APP", label: "In-app", hint: "Inbox and push notification", icon: Smartphone },
];

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

export function NotificationsManager({
  module,
  settings: initialSettings,
  messages: initialMessages,
  users,
  stations = [],
  organizations = [],
}: {
  module: AppModule;
  settings: { channel: Channel; enabled: boolean }[];
  messages: NotificationRow[];
  users: { id: string; firstName?: string | null; lastName?: string | null; email: string }[];
  stations?: { id: string; name: string; code: string }[];
  organizations?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<Channel[]>(
    initialSettings.filter((s) => s.enabled).map((s) => s.channel)
  );
  const [audienceType, setAudienceType] = useState<AudienceType>("ALL_MODULE_USERS");
  const [audienceIds, setAudienceIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [sending, setSending] = useState(false);

  const enabledChannels = useMemo(
    () => new Set(settings.filter((s) => s.enabled).map((s) => s.channel)),
    [settings]
  );

  const audienceOptions = audienceType === "STATION"
    ? stations.map((s) => ({ id: s.id, label: `${s.name} (${s.code})` }))
    : audienceType === "ORGANIZATION"
      ? organizations.map((o) => ({ id: o.id, label: o.name }))
      : users.map((u) => ({
          id: u.id,
          label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
        }));

  const toggleChannel = (channel: Channel, checked: boolean) => {
    setChannels((prev) => checked ? Array.from(new Set([...prev, channel])) : prev.filter((c) => c !== channel));
  };

  const toggleAudience = (id: string, checked: boolean) => {
    setAudienceIds((prev) => checked ? [...prev, id] : prev.filter((value) => value !== id));
  };

  const saveSettings = async (next: { channel: Channel; enabled: boolean }[]) => {
    setSavingSettings(true);
    setError(null);
    const res = await apiPatch<{ settings: { channel: Channel; enabled: boolean }[] }>(
      "/api/tenant/notifications/settings",
      { module, channels: next }
    );
    setSavingSettings(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    const updated = res.data?.settings ?? next;
    setSettings(updated);
    setChannels((prev) => prev.filter((c) => updated.find((s) => s.channel === c)?.enabled));
  };

  const handleSend = async () => {
    setSending(true);
    setError(null);
    const res = await apiPost("/api/tenant/notifications", {
      module,
      title,
      body,
      channels,
      audienceType,
      audienceIds,
      send: true,
    });
    setSending(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setTitle("");
    setBody("");
    setAudienceIds([]);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">{module === "FLEET" ? "Fleet" : "Station"} Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compose a message, pick the audience, and choose which channels to use.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Compose message</CardTitle>
            <CardDescription>Only enabled channels can be selected.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="n_title">Title</Label>
              <Input id="n_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Evening dip reminder" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="n_body">Message</Label>
              <Textarea id="n_body" value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Write the notice…" />
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
                <SelectContent className="w-full">
                  <SelectItem value="ALL_MODULE_USERS">All {module === "FLEET" ? "fleet" : "station"} users</SelectItem>
                  {module === "STATION" && <SelectItem value="STATION">Specific stations</SelectItem>}
                  {module === "FLEET" && <SelectItem value="ORGANIZATION">Specific organizations</SelectItem>}
                  <SelectItem value="USERS">Specific users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {audienceType !== "ALL_MODULE_USERS" && (
              <div className="max-h-48 overflow-y-auto rounded-lg border divide-y">
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

            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CHANNEL_META.map((item) => {
                  const enabled = enabledChannels.has(item.id);
                  const Icon = item.icon;
                  return (
                    <label
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 ${enabled ? "bg-card" : "opacity-50 bg-muted/40"}`}
                    >
                      <Checkbox
                        checked={channels.includes(item.id)}
                        disabled={!enabled}
                        onCheckedChange={(checked) => toggleChannel(item.id, checked === true)}
                      />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Icon className="h-3.5 w-3.5" />
                          {item.label}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.hint}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim() || channels.length === 0}>
                {sending ? "Sending…" : "Send notification"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel features</CardTitle>
            <CardDescription>
              Disable a channel to hide it from compose. Later this can differ for platform vs tenant users.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHANNEL_META.map((item) => {
              const current = settings.find((s) => s.channel === item.id)?.enabled ?? true;
              return (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.hint}</p>
                  </div>
                  <Switch
                    checked={current}
                    disabled={savingSettings}
                    onCheckedChange={(enabled) =>
                      saveSettings(settings.map((s) => s.channel === item.id ? { ...s, enabled } : s))
                    }
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sent & drafts</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {initialMessages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No notifications yet.</p>
          ) : (
            initialMessages.map((message) => (
              <div key={message.id} className="py-4 flex gap-3">
                <div className="h-9 w-9 rounded-lg border flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{message.title}</p>
                    <Badge variant={message.status === "SENT" ? "default" : "outline"}>{message.status}</Badge>
                    {message.channels.map((channel) => (
                      <Badge key={channel} variant="secondary">{channel}</Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{message.body}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {message._count?.deliveries ?? 0} deliveries
                    {message.sentAt ? ` · ${new Date(message.sentAt).toLocaleString()}` : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
