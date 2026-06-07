"use client";

import { useState } from "react";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { MODULE_KEYS, type ModuleKey, type TenantSettings } from "@/lib/tenant/settings";

type Initial = {
  name: string;
  settings: TenantSettings;
  logoUrl: string | null;
};

export function SettingsForm({
  initial,
  storageEnabled,
}: {
  initial: Initial;
  storageEnabled: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [primaryColor, setPrimaryColor] = useState(initial.settings.primaryColor);
  const [timezone, setTimezone] = useState(initial.settings.timezone);
  const [locale, setLocale] = useState(initial.settings.locale);
  const [currency, setCurrency] = useState(initial.settings.currency);
  const [enabled, setEnabled] = useState<ModuleKey[]>(initial.settings.enabledModules);
  const [logoKey, setLogoKey] = useState<string | undefined>(initial.settings.logoKey);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  function toggleModule(key: ModuleKey) {
    setEnabled((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const res = await apiPost<{ url: string; key: string; publicUrl: string }>(
        "/api/tenant/settings/logo",
        { contentType: file.type }
      );
      if (res.error || !res.data) {
        setError(res.error?.message ?? "Upload could not be started.");
        return;
      }
      const put = await fetch(res.data.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        setError("Upload failed.");
        return;
      }
      setLogoKey(res.data.key);
      setLogoUrl(res.data.publicUrl);
      setInfo("Logo uploaded. Remember to Save.");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    setInfo(null);
    setPending(true);
    const res = await apiPatch("/api/tenant/settings", {
      name,
      settings: {
        primaryColor,
        timezone,
        locale,
        currency,
        enabledModules: enabled,
        ...(logoKey ? { logoKey } : {}),
      },
    });
    setPending(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setInfo("Saved.");
  }

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <FormField label="Tenant name" htmlFor="name">
        <TextInput id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>

      <FormField label="Primary color" htmlFor="primaryColor">
        <input
          id="primaryColor"
          type="color"
          value={primaryColor}
          onChange={(e) => setPrimaryColor(e.target.value)}
          className="h-9 w-16 rounded border border-stone-300 bg-white"
        />
      </FormField>

      <FormField label="Timezone" htmlFor="timezone">
        <TextInput
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="UTC"
        />
      </FormField>

      <FormField label="Locale" htmlFor="locale">
        <TextInput
          id="locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          placeholder="en"
        />
      </FormField>

      <FormField label="Default currency" htmlFor="currency">
        <TextInput
          id="currency"
          value={currency}
          maxLength={3}
          onChange={(e) => setCurrency(e.target.value.toUpperCase())}
          placeholder="USD"
        />
      </FormField>

      <div className="flex flex-col gap-2 text-sm">
        <span className="text-stone-700">Enabled modules</span>
        <div className="flex flex-wrap gap-3">
          {MODULE_KEYS.map((key) => (
            <label key={key} className="flex items-center gap-2 capitalize">
              <input
                type="checkbox"
                checked={enabled.includes(key)}
                onChange={() => toggleModule(key)}
              />
              {key}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <span className="text-stone-700">Logo</span>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Tenant logo" className="h-12 w-auto" />
        ) : null}
        {storageEnabled ? (
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={onLogoChange}
          />
        ) : (
          <span className="text-xs text-stone-500">
            Object storage is not configured.
          </span>
        )}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-700">{info}</p> : null}
      <div>
        <Button onClick={submit} disabled={pending || uploading}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
