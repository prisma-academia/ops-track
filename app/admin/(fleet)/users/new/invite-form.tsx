"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Save, ChevronsUpDown, Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const Schema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  otherName: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.email("Invalid email address"),
  roleTemplateId: z.string().min(1, "Role is required"),
  permissions: z.array(z.string()).optional(),
});
type Values = z.infer<typeof Schema>;

const allActions = ["read", "write", "approve"] as const;

type PermModule = { moduleName: string; perms: (typeof PERMISSIONS)[keyof typeof PERMISSIONS][] };

export function InviteTenantUserForm({
  roles,
  allPermissions,
  moduleContext = "FLEET",
  organizationId,
  successRedirect,
}: {
  roles: { id: string; name: string; permissions: string[]; module: string }[];
  allPermissions: readonly string[];
  moduleContext?: "STATION" | "FLEET";
  organizationId?: string | null;
  successRedirect?: string;
}) {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, control, setValue } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { permissions: [] },
  });
  const [error, setError] = useState<string | null>(null);
  const [openRoleSelect, setOpenRoleSelect] = useState(false);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({
    Fleet: true,
    Station: true,
    "Mobile Station": true,
  });

  const roleTemplateId = useWatch({ control, name: "roleTemplateId" });

  useEffect(() => {
    const selectedRole = roles.find((r) => r.id === roleTemplateId);
    if (selectedRole) {
      setValue("permissions", selectedRole.permissions, { shouldDirty: true });
    } else {
      setValue("permissions", []);
    }
  }, [roleTemplateId, roles, setValue]);

  const currentPermissions = useWatch({ control, name: "permissions" }) || [];
  const selectedPermissions = new Set(currentPermissions);

  const togglePermission = (p: string) => {
    const next = selectedPermissions.has(p)
      ? currentPermissions.filter((x) => x !== p)
      : [...currentPermissions, p];
    setValue("permissions", next, { shouldDirty: true });
  };

  const toggleCard = (title: string) => {
    setOpenCards((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const perms = values.permissions ?? [];
    const hasFleetPerm = perms.some((p) => p.startsWith("tenant.fleet"));
    const hasStationOrMobilePerm = perms.some(
      (p) => (p.startsWith("tenant.") && !p.startsWith("tenant.fleet")) || p.startsWith("mobile.tenant.")
    );
    const activeModules = Array.from(
      new Set([
        ...(hasFleetPerm ? ["FLEET"] : []),
        ...(hasStationOrMobilePerm ? ["STATION"] : []),
      ])
    );
    const payload = {
      ...values,
      activeModules: moduleContext === "STATION"
        ? ["STATION"]
        : (activeModules.length > 0 ? activeModules : ["FLEET"]),
      inviteContext: moduleContext,
      organizationId: moduleContext === "STATION" ? organizationId : undefined,
    };
    const res = await apiPost<{ user: { id: string } }>("/api/tenant/users", payload);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.user.id) {
      router.push(successRedirect ? `${successRedirect}/${res.data.user.id}` : `/admin/users/${res.data.user.id}`);
    }
  });

  const groupedPermissions = allPermissions.reduce((acc, key) => {
    const perm = Object.values(PERMISSIONS).find((p) => p.key === key);
    if (!perm) return acc;
    const moduleName = perm.module;
    if (!acc[moduleName]) acc[moduleName] = { moduleName, perms: [] };
    acc[moduleName].perms.push(perm);
    return acc;
  }, {} as Record<string, PermModule>);

  const modulesList = Object.values(groupedPermissions);
  const fleetModulesList = modulesList.filter((m) => m.moduleName.startsWith("tenant.fleet"));
  const stationModulesList = modulesList.filter(
    (m) => m.moduleName.startsWith("tenant.") && !m.moduleName.startsWith("tenant.fleet")
  );
  const mobileModulesList = modulesList.filter((m) => m.moduleName.startsWith("mobile."));

  const getModuleName = (module: string) => {
    return module
      .replace("mobile.tenant.", "")
      .replace("tenant.", "")
      .split(".")
      .map((s) => s.replace(/-/g, " "))
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  };

  const renderPermissionsCard = (list: PermModule[], title: string) => {
    const isOpen = openCards[title] ?? true;
    return (
      <Card className="border-border/40 shadow-sm overflow-hidden p-0 gap-0">
        <Collapsible open={isOpen} onOpenChange={() => toggleCard(title)}>
          <CollapsibleTrigger asChild>
            <CardHeader style={{"paddingBottom": "8px"}} className="pt-2 cursor-pointer select-none flex flex-row items-center justify-between space-y-0">
              <CardTitle className="font-semibold">
                {title}
              </CardTitle>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {/* Column headers */}
                <div className="grid grid-cols-6 border-b border-border/40 bg-muted/30 px-6 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
                  <div className="col-span-3">Permissions Module</div>
                  {allActions.map((action) => (
                    <div key={action} className="text-center">{action}</div>
                  ))}
                </div>

                {/* Rows */}
                {list.map((mod, index) => {
                  const readPerm = mod.perms.find((p) => p.key.endsWith(":read"));
                  const writePerm = mod.perms.find((p) => p.key.endsWith(":write"));
                  const approvePerm = mod.perms.find((p) => p.key.endsWith(":approve"));

                  return (
                    <div
                      key={mod.moduleName}
                      className={`grid grid-cols-6 items-center px-6 py-3 text-sm hover:bg-muted/5 transition-colors ${
                        index !== list.length - 1 ? "border-b border-border/30" : ""
                      }`}
                    >
                      <div className="col-span-3 pr-4">
                        <p className="font-medium text-foreground">{getModuleName(mod.moduleName)}</p>
                      </div>
                      <div className="flex justify-center">
                        {readPerm ? (
                          <Checkbox
                            id={`perm-${readPerm.key}`}
                            checked={selectedPermissions.has(readPerm.key)}
                            onCheckedChange={() => togglePermission(readPerm.key)}
                            className="size-5 rounded-md cursor-pointer data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                        ) : (
                          <div className="size-5 rounded-md border-2 border-muted bg-muted/20 opacity-30 cursor-not-allowed" />
                        )}
                      </div>
                      <div className="flex justify-center">
                        {writePerm ? (
                          <Checkbox
                            id={`perm-${writePerm.key}`}
                            checked={selectedPermissions.has(writePerm.key)}
                            onCheckedChange={() => togglePermission(writePerm.key)}
                            className="size-5 rounded-md cursor-pointer data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                        ) : (
                          <div className="size-5 rounded-md border-2 border-muted bg-muted/20 opacity-30 cursor-not-allowed" />
                        )}
                      </div>
                      <div className="flex justify-center">
                        {approvePerm ? (
                          <Checkbox
                            id={`perm-${approvePerm.key}`}
                            checked={selectedPermissions.has(approvePerm.key)}
                            onCheckedChange={() => togglePermission(approvePerm.key)}
                            className="size-5 rounded-md cursor-pointer data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                          />
                        ) : (
                          <div className="size-5 rounded-md border-2 border-muted bg-muted/20 opacity-30 cursor-not-allowed" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  };

  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* User Details - Left Column */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-lg font-semibold text-foreground">
              User Details
            </CardTitle>
            <CardDescription className="text-xs">
              Provide the details of the new team member.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className={errors.firstName ? "text-destructive" : ""}>First name *</Label>
              <Input id="firstName" {...register("firstName")} className={errors.firstName ? "border-destructive" : ""} placeholder="e.g. John" />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className={errors.lastName ? "text-destructive" : ""}>Last name *</Label>
              <Input id="lastName" {...register("lastName")} className={errors.lastName ? "border-destructive" : ""} placeholder="e.g. Doe" />
              {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherName">Other name (optional)</Label>
              <Input id="otherName" {...register("otherName")} />
              {errors.otherName && <p className="text-xs text-destructive">{errors.otherName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input id="phone" type="tel" {...register("phone")} placeholder="+1 (555) 000-0000" />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>Email *</Label>
              <Input id="email" type="email" {...register("email")} className={errors.email ? "border-destructive" : ""} placeholder="john@example.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className={errors.roleTemplateId ? "text-destructive" : ""}>Role Template *</Label>
              <Controller
                control={control}
                name="roleTemplateId"
                render={({ field }) => {
                  const selectedRole = roles.find((r) => r.id === field.value);
                  const displayLabel = selectedRole ? selectedRole.name : "Select a role...";
                  return (
                    <Popover open={openRoleSelect} onOpenChange={setOpenRoleSelect}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-between font-normal",
                            errors.roleTemplateId && "border-destructive"
                          )}
                        >
                          <span className="truncate">{displayLabel}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search role..." />
                          <CommandList>
                            <CommandEmpty>No role found.</CommandEmpty>
                            <CommandGroup>
                              {roles.map((r) => (
                                <CommandItem
                                  key={r.id}
                                  value={`${r.name} ${r.module}`.toLowerCase()}
                                  onSelect={() => {
                                    field.onChange(r.id);
                                    setOpenRoleSelect(false);
                                  }}
                                  className="flex items-center justify-between cursor-pointer"
                                >
                                  <span>
                                    {r.name}
                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                      ({r.module === "STATION" ? "Station" : "Fleet"})
                                    </span>
                                  </span>
                                  {field.value === r.id && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
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
              {errors.roleTemplateId && <p className="text-xs text-destructive">{errors.roleTemplateId.message}</p>}
            </div>

            {error && <p className="text-sm text-destructive font-medium pt-2">{error}</p>}

            <div className="pt-4">
              <Button type="submit" disabled={isSubmitting} className="w-full gap-2">
                <Save className="h-4 w-4" />
                {isSubmitting ? "Sending invite…" : "Send Invite"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Permissions Matrix - Right Column */}
      <div className="lg:col-span-2 space-y-6">
        {moduleContext === "STATION" ? (
          <>
            {renderPermissionsCard(stationModulesList.filter((m) => !m.moduleName.startsWith("tenant.fleet")), "Station")}
            {renderPermissionsCard(mobileModulesList, "Mobile Station")}
          </>
        ) : (
          <>
            {renderPermissionsCard(stationModulesList, "Station")}
            {renderPermissionsCard(fleetModulesList, "Fleet")}
            {renderPermissionsCard(mobileModulesList, "Mobile Station")}
          </>
        )}
      </div>
    </form>
  );
}
