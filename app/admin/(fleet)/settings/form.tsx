"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiPatch, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useFileUpload } from "@/hooks/use-file-upload";
import { AlertCircleIcon, ImagePlusIcon, XIcon, Loader2 } from "lucide-react";
import { MODULE_KEYS, type ModuleKey, type TenantSettings } from "@/lib/tenant/settings";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Initial = {
  name: string;
  companyEmail: string | null;
  companyPhone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  settings: TenantSettings;
  logoUrl: string | null;
  backgroundUrl: string | null;
  signatureUrl: string | null;
};

export function SettingsForm({
  initial,
  storageEnabled,
}: {
  initial: Initial;
  storageEnabled: boolean;
}) {
  const [name, setName] = useState(initial.name);
  const [companyEmail, setCompanyEmail] = useState(initial.companyEmail || "");
  const [companyPhone, setCompanyPhone] = useState(initial.companyPhone || "");
  const [website, setWebsite] = useState(initial.website || "");
  const [addressLine1, setAddressLine1] = useState(initial.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(initial.addressLine2 || "");
  const [city, setCity] = useState(initial.city || "");
  const [region, setRegion] = useState(initial.region || "");
  const [postalCode, setPostalCode] = useState(initial.postalCode || "");
  const [country, setCountry] = useState(initial.country || "");

  const [primaryColor, setPrimaryColor] = useState(initial.settings.primaryColor);
  const [timezone, setTimezone] = useState(initial.settings.timezone);
  const [locale, setLocale] = useState(initial.settings.locale);
  const [currency, setCurrency] = useState(initial.settings.currency);
  const [varianceThreshold, setVarianceThreshold] = useState(initial.settings.varianceThreshold);
  const [blockOnUnresolvedVariance, setBlockOnUnresolvedVariance] = useState(initial.settings.blockOnUnresolvedVariance);
  const [enabled, setEnabled] = useState<ModuleKey[]>(initial.settings.enabledModules);
  
  const [logoKey, setLogoKey] = useState<string | undefined>(initial.settings.logoKey);
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl);
  const [backgroundKey, setBackgroundKey] = useState<string | undefined>(initial.settings.backgroundKey);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(initial.backgroundUrl);

  const [signatureKey, setSignatureKey] = useState<string | undefined>(initial.settings.signatureKey);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(initial.signatureUrl);

  const [pending, setPending] = useState(false);
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  
  const [bgToRemove, setBgToRemove] = useState(false);
  const [logoToRemove, setLogoToRemove] = useState(false);
  const [signatureToRemove, setSignatureToRemove] = useState(false);

  function toggleModule(key: ModuleKey) {
    setEnabled((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const maxSizeMB = 2;
  const maxSize = maxSizeMB * 1024 * 1024;

  const [
    { files, errors: uploadErrors },
    { openFileDialog, removeFile, getInputProps },
  ] = useFileUpload({
    accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/webp",
    maxSize,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (!file || !(file instanceof File)) return;
      setUploadingLogo(true);
      try {
        const res = await apiPost<any>("/api/tenant/settings/logo", { contentType: file.type });
        if (res.error || !res.data) {
          toast.error(res.error?.message ?? "Upload could not be started.");
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

          const uploadRes = await fetch(res.data.url, { method: "POST", body: formData });
          if (!uploadRes.ok) {
            toast.error("Cloudinary upload failed.");
            return;
          }
          const cloudinaryData = await uploadRes.json();
          publicId = cloudinaryData.secure_url;
          publicUrl = cloudinaryData.secure_url;
        } else {
          const put = await fetch(res.data.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!put.ok) {
            toast.error("S3 Upload failed.");
            return;
          }
          publicId = res.data.key;
          publicUrl = res.data.publicUrl;
        }

        setLogoKey(publicId);
        setLogoUrl(publicUrl);
        toast.success("Logo uploaded. Remember to Save.");
      } finally {
        setUploadingLogo(false);
      }
    }
  });

  const [
    { files: bgFiles, errors: bgUploadErrors },
    { openFileDialog: openBgFileDialog, removeFile: removeBgFile, getInputProps: getBgInputProps },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/webp",
    maxSize,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (!file || !(file instanceof File)) return;
      setUploadingBg(true);
      try {
        const res = await apiPost<any>("/api/tenant/settings/logo", { contentType: file.type });
        if (res.error || !res.data) {
          toast.error(res.error?.message ?? "Upload could not be started.");
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

          const uploadRes = await fetch(res.data.url, { method: "POST", body: formData });
          if (!uploadRes.ok) {
            toast.error("Cloudinary upload failed.");
            return;
          }
          const cloudinaryData = await uploadRes.json();
          publicId = cloudinaryData.secure_url;
          publicUrl = cloudinaryData.secure_url;
        } else {
          const put = await fetch(res.data.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!put.ok) {
            toast.error("S3 Upload failed.");
            return;
          }
          publicId = res.data.key;
          publicUrl = res.data.publicUrl;
        }

        setBackgroundKey(publicId);
        setBackgroundUrl(publicUrl);
        toast.success("Background uploaded. Remember to Save.");
      } finally {
        setUploadingBg(false);
      }
    }
  });

  const [
    { files: sigFiles, errors: sigUploadErrors },
    { openFileDialog: openSigFileDialog, removeFile: removeSigFile, getInputProps: getSigInputProps },
  ] = useFileUpload({
    accept: "image/png,image/jpeg,image/jpg,image/webp",
    maxSize,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (!file || !(file instanceof File)) return;
      setUploadingSignature(true);
      try {
        const res = await apiPost<any>("/api/tenant/settings/logo", { contentType: file.type });
        if (res.error || !res.data) {
          toast.error(res.error?.message ?? "Upload could not be started.");
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

          const uploadRes = await fetch(res.data.url, { method: "POST", body: formData });
          if (!uploadRes.ok) {
            toast.error("Cloudinary upload failed.");
            return;
          }
          const cloudinaryData = await uploadRes.json();
          publicId = cloudinaryData.secure_url;
          publicUrl = cloudinaryData.secure_url;
        } else {
          const put = await fetch(res.data.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!put.ok) {
            toast.error("S3 Upload failed.");
            return;
          }
          publicId = res.data.key;
          publicUrl = res.data.publicUrl;
        }

        setSignatureKey(publicId);
        setSignatureUrl(publicUrl);
        toast.success("Signature uploaded. Remember to Save.");
      } finally {
        setUploadingSignature(false);
      }
    }
  });

  const previewUrl = logoUrl || (files[0]?.preview || null);
  const bgPreviewUrl = backgroundUrl || (bgFiles[0]?.preview || null);
  const sigPreviewUrl = signatureUrl || (sigFiles[0]?.preview || null);

  async function submit() {
    setPending(true);
    const res = await apiPatch("/api/tenant/settings", {
      name,
      companyEmail: companyEmail || null,
      companyPhone: companyPhone || null,
      website: website || null,
      addressLine1: addressLine1 || null,
      addressLine2: addressLine2 || null,
      city: city || null,
      region: region || null,
      postalCode: postalCode || null,
      country: country || null,
      settings: {
        primaryColor,
        timezone,
        locale,
        currency,
        varianceThreshold,
        blockOnUnresolvedVariance,
        enabledModules: enabled,
        ...(logoKey ? { logoKey } : {}),
        ...(backgroundKey ? { backgroundKey } : {}),
        ...(signatureKey ? { signatureKey } : {}),
      },
    });
    setPending(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Saved.");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Settings Column */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* Branding Images */}
        <div>
          <div className="h-48 rounded-t-xl overflow-hidden relative group">
            <div className="relative flex size-full items-center justify-center bg-stone-200 dark:bg-stone-800">
              {uploadingBg ? (
                 <div className="flex flex-col items-center justify-center p-4">
                   <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                   <p className="text-sm font-medium">Uploading background...</p>
                 </div>
              ) : bgPreviewUrl ? (
                <img
                  alt="Background"
                  className="size-full object-cover"
                  src={bgPreviewUrl}
                />
              ) : null}
              <div className="absolute inset-0 flex items-center justify-center gap-2">
                <button
                  aria-label={bgPreviewUrl ? "Change background" : "Upload background"}
                  className="z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={openBgFileDialog}
                  type="button"
                >
                  <ImagePlusIcon aria-hidden="true" size={16} />
                </button>
                {bgPreviewUrl && (
                  <button
                    aria-label="Remove background"
                    className="z-50 flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    onClick={() => setBgToRemove(true)}
                    type="button"
                  >
                    <XIcon aria-hidden="true" size={16} />
                  </button>
                )}
              </div>
            </div>
            <input
              {...getBgInputProps()}
              aria-label="Upload background file"
              className="sr-only"
              disabled={uploadingBg}
            />
          </div>

          <div className="-mt-12 px-6 relative flex items-end justify-between">
            <div className="relative">
              <div className="relative flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-white shadow-black/10 shadow-sm">
                {uploadingLogo ? (
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                ) : previewUrl ? (
                  <img
                    alt="Logo"
                    className="size-full object-cover"
                    src={previewUrl}
                  />
                ) : null}
                <button
                  aria-label="Change logo"
                  className="absolute flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  onClick={openFileDialog}
                  type="button"
                >
                  <ImagePlusIcon aria-hidden="true" size={16} />
                </button>
                <input
                  {...getInputProps()}
                  aria-label="Upload logo file"
                  className="sr-only"
                  disabled={uploadingLogo}
                />
              </div>
              {previewUrl && (
                <button
                  aria-label="Remove logo"
                  className="absolute bottom-0 right-0 z-10 flex size-7 cursor-pointer items-center justify-center rounded-full bg-destructive text-white border-2 border-background outline-none transition-[color,box-shadow] hover:bg-destructive/90"
                  onClick={() => setLogoToRemove(true)}
                  type="button"
                >
                  <XIcon aria-hidden="true" size={12} />
                </button>
              )}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="primaryColor" className="sr-only">Primary color</Label>
                <div className="flex items-center gap-2 bg-background border px-3 py-1.5 rounded-md shadow-sm">
                  <div className="text-xs font-medium text-muted-foreground">Brand Color:</div>
                  <Input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="size-6 p-0 border-0 cursor-pointer bg-transparent"
                  />
                  <span className="text-xs font-mono">{primaryColor}</span>
                </div>
              </div>
            </div>
          </div>
          
          {(bgUploadErrors.length > 0 || uploadErrors.length > 0) && (
            <div className="px-6 mt-4 flex items-center gap-2 text-destructive text-sm">
              <AlertCircleIcon className="size-4 shrink-0" />
              <span>{bgUploadErrors[0] || uploadErrors[0]}</span>
            </div>
          )}
        </div>

        {/* Company Info */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-medium">Company Profile</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Contact Email</Label>
                <Input id="companyEmail" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder="contact@company.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyPhone">Contact Phone</Label>
                <Input id="companyPhone" type="tel" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+1 234 567 8900" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website URL</Label>
              <Input id="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://company.com" />
            </div>
          </div>
        </div>

        {/* Address Info */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-medium">Address Information</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="addressLine1">Address Line 1</Label>
              <Input id="addressLine1" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 Main St" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
              <Input id="addressLine2" value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="Suite 400" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">State / Region</Label>
                <Input id="region" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input id="postalCode" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Documents & Signatures */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-medium">Documents & Signatures</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Authorized Signature</Label>
              <div className="flex items-center gap-4">
                <div className="relative flex h-20 w-48 items-center justify-center overflow-hidden rounded-md border-2 border-dashed bg-stone-50 dark:bg-stone-900">
                  {uploadingSignature ? (
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  ) : sigPreviewUrl ? (
                    <img
                      alt="Authorized Signature"
                      className="h-full w-full object-contain p-1"
                      src={sigPreviewUrl}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No signature</span>
                  )}
                  <input
                    {...getSigInputProps()}
                    aria-label="Upload signature file"
                    className="sr-only"
                    disabled={uploadingSignature}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={openSigFileDialog}
                    disabled={uploadingSignature}
                  >
                    <ImagePlusIcon className="mr-2 size-4" />
                    Upload Signature
                  </Button>
                  {sigPreviewUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setSignatureToRemove(true)}
                    >
                      <XIcon className="mr-2 size-4" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This signature will be appended to generated receipts and vouchers.
              </p>
              {sigUploadErrors.length > 0 && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>{sigUploadErrors[0]}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Localization */}
        <div className="space-y-4 pt-6 border-t">
          <h3 className="text-lg font-medium">System Configuration</h3>
          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="UTC"
              />
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <Label htmlFor="locale">Locale</Label>
              <Input
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                placeholder="en"
              />
            </div>
          </div>
        </div>

        {/* Inventory */}
        <div className="space-y-4 pt-6 pb-2 border-b">
          <h3 className="text-lg font-medium">Inventory Variance</h3>
          <p className="text-sm text-muted-foreground">Configure thresholds and blocking behavior for inventory tracking.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="varianceThreshold">Variance Threshold (Liters)</Label>
              <Input
                id="varianceThreshold"
                type="number"
                min={0}
                value={varianceThreshold}
                onChange={(e) => setVarianceThreshold(Number(e.target.value))}
                placeholder="e.g. 100"
              />
              <p className="text-xs text-muted-foreground">Alerts trigger above this volume difference.</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="blockOnUnresolvedVariance"
              checked={blockOnUnresolvedVariance}
              onCheckedChange={(checked) => setBlockOnUnresolvedVariance(!!checked)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="blockOnUnresolvedVariance"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Block on unresolved variance
              </label>
              <p className="text-sm text-muted-foreground">
                Prevent new dipping sessions if there is an unresolved variance ticket.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 pb-10">
          <Button onClick={submit} disabled={pending || uploadingBg || uploadingLogo || uploadingSignature}>
            {pending ? "Saving…" : "Save All Changes"}
          </Button>
        </div>
      </div>

      {/* Modules Column */}
      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="font-semibold text-lg">Enabled Modules</h3>
              <p className="text-sm text-muted-foreground mt-1">Toggle features and modules available for your tenant.</p>
            </div>
            
            <div className="space-y-4">
              {MODULE_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between space-x-2">
                  <Label
                    htmlFor={`module-${key}`}
                    className="flex flex-col gap-1 cursor-pointer"
                  >
                    <span className="text-sm font-medium leading-none capitalize">
                      {key}
                    </span>
                  </Label>
                  <Switch
                    id={`module-${key}`}
                    checked={enabled.includes(key)}
                    onCheckedChange={() => toggleModule(key)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <Dialog open={bgToRemove} onOpenChange={setBgToRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Background?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the background banner image? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBgToRemove(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              removeBgFile(bgFiles[0]?.id);
              setBackgroundUrl(null);
              setBackgroundKey(undefined);
              setBgToRemove(false);
            }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logoToRemove} onOpenChange={setLogoToRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Logo?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the company logo? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoToRemove(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              removeFile(files[0]?.id);
              setLogoUrl(null);
              setLogoKey(undefined);
              setLogoToRemove(false);
            }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={signatureToRemove} onOpenChange={setSignatureToRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Signature?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the authorized signature? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignatureToRemove(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => {
              removeSigFile(sigFiles[0]?.id);
              setSignatureUrl(null);
              setSignatureKey(undefined);
              setSignatureToRemove(false);
            }}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
