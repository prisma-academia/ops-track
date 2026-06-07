"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";

export function RoleEditor({
  permissions,
  scope,
}: {
  permissions: readonly string[];
  scope: "platform" | "tenant";
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(p: string) {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  }

  async function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setPending(true);
    const res = await apiPost<{ role: { id: string } }>(
      scope === "platform" ? "/api/platform/role-templates" : "/api/tenant/role-templates",
      { name: name.trim(), permissions: Array.from(selected) }
    );
    setPending(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.role.id) {
      router.push(scope === "platform" ? `/role-templates/${res.data.role.id}` : `/admin/role-templates/${res.data.role.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Role name" htmlFor="rname">
        <TextInput id="rname" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <div className="grid grid-cols-2 gap-2 rounded border border-stone-200 p-3 text-sm">
        {permissions.map((p) => (
          <label key={p} className="flex items-center gap-2">
            <input type="checkbox" checked={selected.has(p)} onChange={() => toggle(p)} />
            <span className="font-mono text-xs">{p}</span>
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Create role"}
        </Button>
      </div>
    </div>
  );
}
