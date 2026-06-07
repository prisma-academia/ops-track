"use client";

import { useState } from "react";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
      setInfo("Role permissions applied.");
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
    setInfo("Permissions saved.");
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

  return (
    <div className="mt-4 flex flex-col gap-4 text-sm">
      <div>
        <label className="text-xs uppercase text-stone-500" htmlFor="role">
          Apply role
        </label>
        <div className="mt-1 flex gap-2">
          <select
            id="role"
            className="flex-1 rounded border border-stone-300 bg-white px-3 py-2 text-sm"
            value={roleId}
            onChange={(e) => {
              const nextRoleId = e.target.value;
              setRoleId(nextRoleId);
              if (nextRoleId) {
                const role = roles.find((r) => r.id === nextRoleId);
                if (role) {
                  setSelected(new Set(role.permissions));
                }
              }
            }}
          >
            <option value="">Select template…</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <Button onClick={applyRole} disabled={pending !== null || !roleId}>
            {pending === "apply" ? "Applying…" : "Apply"}
          </Button>
        </div>
      </div>

      <div>
        <div className="text-xs uppercase text-stone-500">Permissions ({scope})</div>
        <div className="mt-2 grid grid-cols-1 gap-1 rounded border border-stone-200 p-3">
          {allPermissions.map((p) => (
            <label key={p} className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox checked={selected.has(p)} onCheckedChange={() => toggle(p)} />
              <span className="font-mono">{p}</span>
            </label>
          ))}
        </div>
        <div className="mt-2">
          <Button onClick={savePermissions} disabled={pending !== null}>
            {pending === "save" ? "Saving…" : "Save permissions"}
          </Button>
        </div>
      </div>

      <div>
        <Button variant="outline" onClick={resetPassword} disabled={pending !== null}>
          {pending === "reset" ? "Resetting…" : "Reset password & sign out"}
        </Button>
      </div>

      {info ? <p className="text-sm text-green-700">{info}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
