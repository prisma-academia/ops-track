"use client";

import { useState } from "react";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Save, KeyRound, ShieldAlert } from "lucide-react";

const allActions = ["read", "write", "approve"];

export function UserDetailActions({
  scope,
  permissions,
  allPermissions,
  roles,
  applyRoleEndpoint,
  permissionsEndpoint,
  resetPasswordEndpoint,
}: {
  userId: string;
  scope: "platform" | "tenant";
  permissions: string[];
  allPermissions: readonly string[];
  roles: { id: string; name: string; permissions: string[] }[];
  applyRoleEndpoint: string;
  permissionsEndpoint: string;
  resetPasswordEndpoint: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(permissions));
  const [roleId, setRoleId] = useState("");
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  function toggle(p: string) {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  }

  async function applyRole() {
    if (!roleId) return;
    setPending("apply");
    setError(null);
    setInfo(null);
    const res = await apiPost<{ permissions: string[] }>(applyRoleEndpoint, { roleTemplateId: roleId });
    setPending(null);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.permissions) {
      setSelected(new Set(res.data.permissions));
      setInfo("Role template applied successfully.");
    }
  }

  async function savePermissions() {
    setPending("save");
    setError(null);
    setInfo(null);
    const res = await apiPatch<{ permissions: string[] }>(permissionsEndpoint, {
      permissions: Array.from(selected),
    });
    setPending(null);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setInfo("Permissions saved successfully.");
  }

  async function resetPassword() {
    if (!confirm("Reset this user's password and revoke their sessions?")) return;
    setPending("reset");
    setError(null);
    setInfo(null);
    const res = await apiPost(resetPasswordEndpoint, {});
    setPending(null);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    setInfo("Password reset emailed.");
  }

  const groupedPermissions = allPermissions.reduce((acc, key) => {
    const perm = Object.values(PERMISSIONS).find(p => p.key === key);
    if (!perm) return acc;
    const moduleName = perm.module;
    if (!acc[moduleName]) acc[moduleName] = { moduleName, perms: [] };
    acc[moduleName].perms.push(perm);
    return acc;
  }, {} as Record<string, { moduleName: string, perms: typeof PERMISSIONS[keyof typeof PERMISSIONS][] }>);

  const modulesList = Object.values(groupedPermissions);

  const getModuleName = (module: string) => {
    return module.replace("tenant.", "").replace("platform.", "").split(".").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              Permissions Matrix
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-48">
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Apply Template..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={applyRole} disabled={pending !== null || !roleId} variant="outline" size="sm" className="h-8 px-3">
              {pending === "apply" ? "..." : "Apply"}
            </Button>
            <Button onClick={savePermissions} disabled={pending !== null} size="sm" className="h-8 gap-2 ml-1">
              <Save className="h-4 w-4" />
              {pending === "save" ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            {/* Column headers */}
            <div className="grid grid-cols-6 border-b border-border/40 bg-muted/30 px-6 py-3 font-medium text-xs text-muted-foreground uppercase tracking-wider">
              <div className="col-span-3">Permissions Module</div>
              {allActions.map((action) => (
                <div key={action} className="text-center">{action}</div>
              ))}
            </div>

            {/* Rows */}
            {modulesList.map((mod, index) => {
              const readPerm = mod.perms.find(p => p.key.endsWith(':read'));
              const writePerm = mod.perms.find(p => p.key.endsWith(':write'));
              const approvePerm = mod.perms.find(p => p.key.endsWith(':approve'));
              
              const desc = [readPerm?.description, writePerm?.description].filter(Boolean).join(" • ");

              return (
                <div
                  key={mod.moduleName}
                  className={`grid grid-cols-6 items-center px-6 py-4 text-sm hover:bg-muted/5 transition-colors ${
                    index !== modulesList.length - 1 ? "border-b border-border/30" : ""
                  }`}
                >
                  <div className="col-span-3 pr-4">
                    <p className="font-medium text-foreground">{getModuleName(mod.moduleName)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                  </div>
                  <div className="flex justify-center">
                    {readPerm ? (
                      <Checkbox
                        id={`perm-${readPerm.key}`}
                        checked={selected.has(readPerm.key)}
                        onCheckedChange={() => toggle(readPerm.key)}
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
                        onCheckedChange={() => toggle(writePerm.key)}
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
                        onCheckedChange={() => toggle(approvePerm.key)}
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
      
      {/* Status Messages */}
      {(info || error) && (
        <div className={`p-3 text-sm rounded-md border ${info ? 'bg-green-50/50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400' : 'bg-red-50/50 border-red-200 text-red-600 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400'}`}>
          {info || error}
        </div>
      )}

      {/* Danger Zone */}
      <Card className="border-red-200/50 dark:border-red-900/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-4 w-4" />
            Security Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Resetting the password will immediately revoke all active sessions for this user and email them a recovery link.
          </p>
          <Button variant="destructive" size="sm" onClick={resetPassword} disabled={pending !== null} className="gap-2">
            <KeyRound className="h-4 w-4" />
            {pending === "reset" ? "Resetting…" : "Reset password & sign out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
