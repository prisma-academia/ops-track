"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Loader2, ImagePlusIcon, XIcon, AlertCircleIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiPatch, apiPost } from "@/lib/client/api";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/use-file-upload";
import nigerianLocations from "@/constant/nigerian-locations.json";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  companyEmail: z.string().email().optional().or(z.literal("")).nullable(),
  companyPhone: z.string().optional().or(z.literal("")).nullable(),
  address: z.string().optional().or(z.literal("")).nullable(),
  state: z.string().optional().or(z.literal("")).nullable(),
  lga: z.string().optional().or(z.literal("")).nullable(),
  contactPerson: z.string().optional().or(z.literal("")).nullable(),
  contactPhone: z.string().optional().or(z.literal("")).nullable(),
  contactPosition: z.string().optional().or(z.literal("")).nullable(),
  ownerId: z.string().optional().or(z.literal("")).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export type OrganizationEditValues = {
  id: string;
  name: string;
  slug: string;
  type: "INTERNAL" | "EXTERNAL";
  companyEmail: string | null;
  companyPhone: string | null;
  address: string | null;
  state: string | null;
  lga: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  contactPosition: string | null;
  ownerId: string | null;
  logoKey: string | null;
};

function logoPreviewUrl(logoKey: string | null | undefined) {
  if (!logoKey) return null;
  if (logoKey.startsWith("http")) return logoKey;
  const domain = process.env.NEXT_PUBLIC_S3_DOMAIN;
  return domain ? `https://${domain}/${logoKey}` : logoKey;
}

export function EditOrgForm({
  organization,
  users,
}: {
  organization: OrganizationEditValues;
  users: { id: string; firstName: string | null; lastName: string | null; email: string }[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [logoKey, setLogoKey] = useState<string | undefined>(organization.logoKey || undefined);
  const [logoUrl, setLogoUrl] = useState<string | null>(logoPreviewUrl(organization.logoKey));
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [openStateSelect, setOpenStateSelect] = useState(false);
  const [openLgaSelect, setOpenLgaSelect] = useState(false);

  const { register, handleSubmit, formState: { errors }, control, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name || "",
      type: organization.type || "EXTERNAL",
      companyEmail: organization.companyEmail || "",
      companyPhone: organization.companyPhone || "",
      address: organization.address || "",
      state: organization.state || "",
      lga: organization.lga || "",
      contactPerson: organization.contactPerson || "",
      contactPhone: organization.contactPhone || "",
      contactPosition: organization.contactPosition || "",
      ownerId: organization.ownerId || "none",
    },
  });

  const selectedState = watch("state");
  const selectedLga = watch("lga");

  useEffect(() => {
    if (selectedState && selectedState !== (organization.state || "")) {
      setValue("lga", "", { shouldValidate: false });
    }
  }, [selectedState, setValue, organization.state]);

  const availableLgas = selectedState
    ? nigerianLocations.find((loc) => loc.state === selectedState)?.lgas || []
    : [];

  const maxSize = 2 * 1024 * 1024;

  const [{ files, errors: uploadErrors }, { openFileDialog, removeFile, getInputProps }] = useFileUpload({
    accept: "image/svg+xml,image/png,image/jpeg,image/jpg,image/webp",
    maxSize,
    onFilesAdded: async (addedFiles) => {
      const file = addedFiles[0]?.file;
      if (!file || !(file instanceof File)) return;
      setErrorMsg(null);
      setUploadingLogo(true);
      try {
        const res = await apiPost<any>("/api/tenant/organizations/logo", { contentType: file.type });
        if (res.error || !res.data) {
          setErrorMsg(res.error?.message ?? "Upload could not be started.");
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
            setErrorMsg("Cloudinary upload failed.");
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
            setErrorMsg("S3 Upload failed.");
            return;
          }
          publicId = res.data.key;
          publicUrl = res.data.publicUrl;
        }

        setLogoKey(publicId);
        setLogoUrl(publicUrl);
      } finally {
        setUploadingLogo(false);
      }
    }
  });

  const previewUrl = logoUrl || (files[0]?.preview || null);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiPatch<{ organization: unknown }>(`/api/tenant/organizations/${organization.id}`, {
        ...data,
        ownerId: data.ownerId === "none" ? null : data.ownerId,
        logoKey: logoKey || null,
      });

      if (res.error) {
        setErrorMsg(res.error.message);
        return;
      }

      toast("Organization updated", {
        description: "The organization profile has been successfully saved.",
      });
      router.push(`/admin/organizations/${organization.id}`);
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {errorMsg && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                  <AlertCircleIcon className="h-4 w-4" />
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>Organization Name*</Label>
                  <Input id="name" placeholder="e.g. Acme Logistics" {...register("name")} className={errors.name ? "border-destructive" : ""} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Short Identifier</Label>
                  <Input id="slug" value={organization.slug} disabled className="bg-muted/50" />
                  <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type*</Label>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="w-full" id="type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent position="popper">
                          <SelectItem value="INTERNAL">Internal (Own Company)</SelectItem>
                          <SelectItem value="EXTERNAL">External (Client)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type && <p className="text-xs text-destructive">{errors.type.message as string}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ownerId">Organization Owner</Label>
                  <Controller
                    control={control}
                    name="ownerId"
                    render={({ field }) => {
                      const selectedUser = users.find((u) => u.id === field.value);
                      return (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between h-auto py-2 px-3 font-normal",
                                (!field.value || field.value === "none") && "text-muted-foreground"
                              )}
                            >
                              {selectedUser ? (
                                <div className="flex flex-col items-start text-left gap-0.5">
                                  <span className="font-medium text-sm leading-none">{selectedUser.firstName} {selectedUser.lastName}</span>
                                  <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
                                </div>
                              ) : (
                                "Select owner (optional)"
                              )}
                              <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search users..." />
                              <CommandList>
                                <CommandEmpty>No users found.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    value="none"
                                    onSelect={() => field.onChange("none")}
                                  >
                                    None
                                  </CommandItem>
                                  {users.map((u) => (
                                    <CommandItem
                                      key={u.id}
                                      value={`${u.firstName} ${u.lastName} ${u.email} ${u.id}`}
                                      onSelect={() => field.onChange(u.id)}
                                    >
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-sm leading-none">{u.firstName} {u.lastName}</span>
                                        <span className="text-xs text-muted-foreground">{u.email}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      );
                    }}
                  />
                  {errors.ownerId && <p className="text-xs text-destructive">{errors.ownerId.message as string}</p>}
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="font-bold text-xl">Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="companyEmail" className={errors.companyEmail ? "text-destructive" : ""}>Company Email</Label>
                    <Input id="companyEmail" type="email" placeholder="contact@acme.com" {...register("companyEmail")} className={errors.companyEmail ? "border-destructive" : ""} />
                    {errors.companyEmail && <p className="text-xs text-destructive">{errors.companyEmail.message as string}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">Company Phone</Label>
                    <Input id="companyPhone" placeholder="+234..." {...register("companyPhone")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Contact Person</Label>
                    <Input id="contactPerson" placeholder="John Doe" {...register("contactPerson")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPosition">Contact Position</Label>
                    <Input id="contactPosition" placeholder="Manager" {...register("contactPosition")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input id="contactPhone" placeholder="+234..." {...register("contactPhone")} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" placeholder="123 Business Way" {...register("address")} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Popover open={openStateSelect} onOpenChange={setOpenStateSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          id="state"
                          className={cn("w-full justify-between font-normal bg-background", errors.state && "border-destructive")}
                        >
                          <span className="truncate">{selectedState || "Select state..."}</span>
                          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search state..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No state found.</CommandEmpty>
                            <CommandGroup>
                              {nigerianLocations.map((loc) => (
                                <CommandItem
                                  key={loc.state}
                                  value={loc.state.toLowerCase()}
                                  onSelect={() => {
                                    setValue("state", loc.state, { shouldValidate: true });
                                    setOpenStateSelect(false);
                                  }}
                                  data-checked={selectedState === loc.state}
                                >
                                  {loc.state}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <input type="hidden" {...register("state")} />
                    {errors.state && <p className="text-xs text-destructive">{errors.state.message as string}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lga">LGA</Label>
                    <Popover open={openLgaSelect} onOpenChange={setOpenLgaSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          id="lga"
                          disabled={!selectedState}
                          className={cn("w-full justify-between font-normal bg-background", errors.lga && "border-destructive")}
                        >
                          <span className="truncate">{selectedLga || "Select LGA..."}</span>
                          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search LGA..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No LGA found.</CommandEmpty>
                            <CommandGroup>
                              {availableLgas.map((lga) => (
                                <CommandItem
                                  key={lga.name}
                                  value={lga.name.toLowerCase()}
                                  onSelect={() => {
                                    setValue("lga", lga.name, { shouldValidate: true });
                                    setOpenLgaSelect(false);
                                  }}
                                  data-checked={selectedLga === lga.name}
                                >
                                  {lga.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <input type="hidden" {...register("lga")} />
                    {errors.lga && <p className="text-xs text-destructive">{errors.lga.message as string}</p>}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4 border-t pt-6">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || uploadingLogo}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Organization Logo</h3>
            <div className="flex flex-col items-center">
              <div className="relative flex size-32 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-stone-100 dark:bg-stone-800 shadow-sm">
                {uploadingLogo ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : previewUrl ? (
                  <img
                    alt="Logo"
                    className="size-full object-cover"
                    src={previewUrl}
                  />
                ) : null}
                <button
                  aria-label="Change logo"
                  className="absolute flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-[color,box-shadow] hover:bg-black/80"
                  onClick={openFileDialog}
                  type="button"
                >
                  <ImagePlusIcon aria-hidden="true" size={20} />
                </button>
                <input
                  {...getInputProps()}
                  aria-label="Upload logo file"
                  className="sr-only"
                  disabled={uploadingLogo}
                />
              </div>
              {previewUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    removeFile(files[0]?.id);
                    setLogoUrl(null);
                    setLogoKey(undefined);
                  }}
                  type="button"
                >
                  <XIcon className="h-4 w-4 mr-2" />
                  Remove Logo
                </Button>
              )}
              {uploadErrors.length > 0 && (
                <div className="mt-4 flex items-center gap-2 text-destructive text-sm text-center">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>{uploadErrors[0]}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
