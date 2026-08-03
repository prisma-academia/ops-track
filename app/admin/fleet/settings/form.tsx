"use client";

import { useState } from "react";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useFileUpload } from "@/hooks/use-file-upload";
import { AlertCircleIcon, ImageIcon, UploadIcon, XIcon, Loader2 } from "lucide-react";
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

  const maxSizeMB = 2;
  const maxSize = maxSizeMB * 1024 * 1024; // 2MB default

  const [
    { files, isDragging, errors: uploadErrors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/webp",
    maxSize,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (!file || !(file instanceof File)) return;
      setError(null);
      setUploading(true);
      try {
        const res = await apiPost<any>(
          "/api/tenant/settings/logo",
          { contentType: file.type }
        );
        if (res.error || !res.data) {
          setError(res.error?.message ?? "Upload could not be started.");
          return;
        }

        let publicUrl = "";
        let publicId = "";

        if (res.data.uploadType === "cloudinary") {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("api_key", res.data.apiKey);
          formData.append("timestamp", res.data.timestamp.toString());
          formData.append("signature", res.data.signature);

          const uploadRes = await fetch(res.data.url, {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            setError("Cloudinary upload failed.");
            return;
          }

          const cloudinaryData = await uploadRes.json();
          publicId = cloudinaryData.secure_url; // We'll just save the secure URL as the logoKey
          publicUrl = cloudinaryData.secure_url;
        } else {
          // S3 flow
          const put = await fetch(res.data.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!put.ok) {
            setError("S3 Upload failed.");
            return;
          }
          publicId = res.data.key;
          publicUrl = res.data.publicUrl;
        }

        setLogoKey(publicId);
        setLogoUrl(publicUrl);
        setInfo("Logo uploaded. Remember to Save.");
      } finally {
        setUploading(false);
      }
    }
  });

  const previewUrl = logoUrl || (files[0]?.preview || null);
  const displayFileName = files[0]?.file.name || "Tenant Logo";

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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Left Column - General Settings */}
      <div className="md:col-span-2 space-y-6 max-w-xl">
        <div className="space-y-4 pb-2 border-b">
          <div className="flex flex-col gap-2">
            <Label>Logo</Label>
            <p className="text-sm text-muted-foreground">Upload your organization logo to display across the platform.</p>
          </div>
          
          <div className="relative max-w-md">
            <div
              className="relative flex min-h-48 flex-col items-center justify-center overflow-hidden rounded-xl border border-input border-dashed p-4 transition-colors has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
              data-dragging={isDragging || undefined}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <input
                {...getInputProps()}
                aria-label="Upload logo file"
                className="sr-only"
                disabled={uploading}
              />
              
              {uploading ? (
                <div className="flex flex-col items-center justify-center p-4">
                   <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                   <p className="text-sm font-medium">Uploading logo...</p>
                </div>
              ) : previewUrl ? (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-background">
                  <img
                    alt={displayFileName}
                    className="mx-auto max-h-full rounded object-contain"
                    src={previewUrl}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                  <div
                    aria-hidden="true"
                    className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
                  >
                    <ImageIcon className="size-4 opacity-60" />
                  </div>
                  <p className="mb-1.5 font-medium text-sm">Drop your logo here</p>
                  <p className="text-muted-foreground text-xs">
                    SVG, PNG, JPG or WEBP (max. {maxSizeMB}MB)
                  </p>
                  <Button
                    className="mt-4"
                    onClick={openFileDialog}
                    variant="outline"
                    type="button"
                  >
                    <UploadIcon
                      aria-hidden="true"
                      className="-ms-1 size-4 opacity-60"
                    />
                    Select image
                  </Button>
                </div>
              )}
            </div>

            {previewUrl && !uploading && (
              <div className="absolute top-4 right-4">
                <button
                  aria-label="Remove image"
                  className="z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={() => {
                     removeFile(files[0]?.id);
                     setLogoUrl(null);
                     setLogoKey(undefined);
                  }}
                  type="button"
                >
                  <XIcon aria-hidden="true" className="size-4" />
                </button>
              </div>
            )}
          </div>

          {uploadErrors.length > 0 && (
            <div
              className="flex items-center gap-1 text-destructive text-xs mt-2"
              role="alert"
            >
              <AlertCircleIcon className="size-3 shrink-0" />
              <span>{uploadErrors[0]}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Tenant name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 p-1 cursor-pointer"
              />
              <span className="text-sm font-mono text-muted-foreground">{primaryColor}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="currency">Default currency</Label>
            <Input
              id="currency"
              value={currency}
              maxLength={3}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="UTC"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="locale">Locale</Label>
            <Input
              id="locale"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="en"
            />
          </div>
        </div>

        {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}
        {info ? <p className="text-sm font-medium text-emerald-600">{info}</p> : null}
        
        <div className="pt-4 border-t">
          <Button onClick={submit} disabled={pending || uploading}>
            {pending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Right Column - Modules */}
      <div className="md:col-span-1 border-l pl-6 pt-2">
        <div className="flex flex-col gap-6">
          <div>
            <h3 className="font-semibold mb-1">Enabled Modules</h3>
            <p className="text-sm text-muted-foreground mb-4">Toggle features and modules available for your tenant.</p>
            <div className="flex flex-col gap-3">
              {MODULE_KEYS.map((key) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`module-${key}`}
                    checked={enabled.includes(key)}
                    onCheckedChange={() => toggleModule(key)}
                  />
                  <label
                    htmlFor={`module-${key}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer"
                  >
                    {key}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
