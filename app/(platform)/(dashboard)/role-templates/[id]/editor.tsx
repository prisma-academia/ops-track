"use client";

import { useState } from "react";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";

export function RoleDetailEditor({
  id,
  name,
  isSystem,
  initial,
  allPermissions,
  endpoint,
}: {
  id: string;
  name: string;
  isSystem: boolean;
  initial: string[];
  allPermissions: readonly string[];
  endpoint: string;
}) {
  void id;
  const [n, setN] = useState(name);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function toggle(p: string) {
    const next = new Set(selected);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setSelected(next);
  }

  async function save() {
    setError(null);
    setInfo(null);
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
    setInfo("Saved.");
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Role name" htmlFor="rn">
        <TextInput id="rn" value={n} onChange={(e) => setN(e.target.value)} disabled={isSystem} />
      </FormField>
      {isSystem ? (
        <p className="text-xs text-stone-500">
          System roles cannot be renamed. Built-in Owner role permissions cannot be reduced.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2 rounded border border-stone-200 p-3 text-sm">
        {allPermissions.map((p) => (
          <label key={p} className="flex items-center gap-2">
            <input type="checkbox" checked={selected.has(p)} onChange={() => toggle(p)} />
            <span className="font-mono text-xs">{p}</span>
          </label>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-green-700">{info}</p> : null}
      <div>
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
