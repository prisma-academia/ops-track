"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isFleetPermissionKey, PERMISSIONS } from "@/lib/auth/permissions";
import { Save, ArrowLeft, Loader2, AlertCircle, Pencil } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RoleDetailEditor({
  id,
  name,
  isSystem,
  initial,
  allPermissions,
  endpoint,
  moduleContext,
  readOnly = false,
  canEdit = true,
  editHref,
}: {
  id: string;
  name: string;
  isSystem: boolean;
  initial: string[];
  allPermissions: readonly string[];
  endpoint: string;
  moduleContext?: "STATION" | "FLEET";
  readOnly?: boolean;
  canEdit?: boolean;
  editHref?: string;
}) {
  void id;
  const [n, setN] = useState(name);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const togglePermission = (p: string) => {
    if (readOnly) return;
    if (isSystem && initial.includes(p)) return;
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  };

  const filteredPermissions = allPermissions.filter((key) => {
    if (moduleContext === "STATION") return !isFleetPermissionKey(key);
    if (moduleContext === "FLEET") return isFleetPermissionKey(key);
    return true;
  });

  type PermissionItem = { key: string; module: string; description: string };
  const allPermObjects = Object.values(PERMISSIONS) as PermissionItem[];

  const groupedPermissions = filteredPermissions.reduce((acc, key) => {
    const perm = allPermObjects.find((p) => p.key === key);
    if (!perm) return acc;
    const moduleName = perm.module;
    if (!acc[moduleName]) acc[moduleName] = { moduleName, perms: [] };
    acc[moduleName].perms.push(perm);
    return acc;
  }, {} as Record<string, { moduleName: string; perms: PermissionItem[] }>);

  const modulesList = Object.values(groupedPermissions);
  const isFleetAdminModule = (name: string) => name === "tenant.users" || name === "tenant.roles";
  const fleetModulesList = modulesList.filter(
    (m) =>
      m.moduleName.startsWith("tenant.fleet") ||
      (moduleContext === "FLEET" && isFleetAdminModule(m.moduleName))
  );
  const stationModulesList = modulesList.filter(
    (m) =>
      m.moduleName.startsWith("tenant.") &&
      !m.moduleName.startsWith("tenant.fleet") &&
      !(moduleContext === "FLEET" && isFleetAdminModule(m.moduleName))
  );
  const mobileModulesList = modulesList.filter((m) => m.moduleName.startsWith("mobile."));
  const webModulesList = modulesList.filter((m) => !m.moduleName.startsWith("mobile."));
  const useInviteLayout = stationModulesList.length > 0 || fleetModulesList.length > 0;

  const getModuleName = (module: string) => {
    return module
      .replace("mobile.tenant.", "")
      .replace("tenant.", "")
      .replace("platform.", "")
      .split(".")
      .map((s) => s.replace(/-/g, " "))
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  };

  const allActions = ["read", "write", "approve"];

  const renderPermissionsCard = (
    list: typeof modulesList,
    title: string,
    description: string
  ) => {
    if (list.length === 0) return null;
    return (
      <Card className="border-border/40 shadow-sm overflow-hidden p-0 gap-0">
        <CardHeader className="bg-muted/10 border-b border-border/40 py-4 px-6">
          <CardTitle className="text-base font-semibold text-foreground">
            {title}
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            {description}
          </CardDescription>
        </CardHeader>
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
              const readPerm = mod.perms.find(p => p.key.endsWith(':read'));
              const writePerm = mod.perms.find(p => p.key.endsWith(':write'));
              const approvePerm = mod.perms.find(p => p.key.endsWith(':approve'));
              const otherPerms = mod.perms.filter(p => !p.key.endsWith(':read') && !p.key.endsWith(':write') && !p.key.endsWith(':approve'));

              const desc = [readPerm?.description, writePerm?.description, approvePerm?.description].filter(Boolean).join(" • ");

              return (
                <div
                  key={mod.moduleName}
                  className={`grid grid-cols-6 items-center px-6 py-4 text-sm hover:bg-muted/5 transition-colors ${
                    index !== list.length - 1 ? "border-b border-border/30" : ""
                  }`}
                >
                  <div className="col-span-3 pr-4">
                    <p className="font-medium text-foreground text-sm">{getModuleName(mod.moduleName)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                    {otherPerms.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {otherPerms.map((op) => (
                          <label key={op.key} className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                            <Checkbox
                              checked={selected.has(op.key)}
                              disabled={readOnly || (isSystem && initial.includes(op.key))}
                              onCheckedChange={() => togglePermission(op.key)}
                              className="size-4"
                            />
                            <span>{op.description || op.key}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    {readPerm ? (
                      <Checkbox
                        id={`perm-${readPerm.key}`}
                        checked={selected.has(readPerm.key)}
                        disabled={readOnly || (isSystem && initial.includes(readPerm.key))}
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
                        checked={selected.has(writePerm.key)}
                        disabled={readOnly || (isSystem && initial.includes(writePerm.key))}
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
                        checked={selected.has(approvePerm.key)}
                        disabled={readOnly || (isSystem && initial.includes(approvePerm.key))}
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
      </Card>
    );
  };

  async function save() {
    setError(null);
    setPending(true);
    const res = await apiPatch(endpoint, {
      ...(isSystem ? {} : { name: n }),
      permissions: Array.from(selected),
    });
    setPending(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    router.push(endpoint.includes("platform") ? "/role-templates" : "/admin/role-templates");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground">
              Role Details
            </CardTitle>
            {isSystem && (
              <Badge variant="secondary" className="text-xs">
                Built-in System Role
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            {readOnly
              ? "View role template permissions. Editing requires write access."
              : isSystem
                ? "System roles cannot be renamed. Built-in permissions are pre-configured."
                : "Update the role template name and permissions."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2 max-w-md">
            <Label htmlFor="rn" className="text-xs font-semibold text-foreground">
              Role name *
            </Label>
            <Input
              id="rn"
              value={n}
              onChange={(e) => setN(e.target.value)}
              disabled={readOnly || isSystem}
              className="h-10 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {useInviteLayout ? (
        <>
          {renderPermissionsCard(
            stationModulesList,
            "Station",
            "Station web portal modules such as users, roles, stations, and operations."
          )}
          {renderPermissionsCard(
            fleetModulesList,
            "Fleet",
            "Fleet web portal modules such as orders, transports, sales, and reports."
          )}
          {renderPermissionsCard(
            mobileModulesList,
            "Mobile Station",
            "Field mobile access permissions for users assigned this role template."
          )}
        </>
      ) : (
        <>
          {renderPermissionsCard(
            webModulesList,
            "Web Portal Permissions",
            "Select module read, write, or approve access rights for users assigned this role template."
          )}
          {renderPermissionsCard(
            mobileModulesList,
            "Mobile App Permissions",
            "Select field mobile access permissions for users assigned this role template."
          )}
        </>
      )}

      {error && (
        <Alert variant="destructive" className="py-2.5">
          <AlertCircle className="size-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
          className="text-xs h-9"
        >
          <ArrowLeft className="mr-1.5 size-3.5" />
          Back
        </Button>
        {readOnly && canEdit && editHref ? (
          <Button type="button" className="text-xs h-9 gap-2" asChild>
            <Link href={editHref}>
              <Pencil className="size-3.5" />
              Edit
            </Link>
          </Button>
        ) : null}
        {!readOnly ? (
          <Button
            type="button"
            onClick={save}
            disabled={pending}
            className="text-xs h-9 font-semibold min-w-24 gap-2"
          >
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                Save Changes
              </>
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
