"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Workspace = { slug: string; name: string };

export function WorkspaceJumpForm() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/workspaces")
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        const list: Workspace[] = j?.data?.tenants ?? [];
        setWorkspaces(list);
        if (list.length > 0) setSlug(list[0].slug);
      })
      .catch(() => {
        if (active) setError("Could not load workspaces.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function jump() {
    if (!slug) {
      setError("Select a workspace.");
      return;
    }
    if (typeof window === "undefined") return;
    const { protocol, host } = window.location;
    window.location.assign(`${protocol}//${slug}.${host}/admin/auth/login`);
  }

  const empty = !loading && workspaces.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <FormField label="Workspace" htmlFor="ws-slug" error={error ?? undefined}>
        <Select
          value={slug}
          onValueChange={(val) => {
            if (val) {
              setSlug(val);
              setError(null);
            }
          }}
          disabled={loading || empty}
        >
          <SelectTrigger id="ws-slug" className="w-full">
            <SelectValue placeholder={loading ? "Loading…" : empty ? "No workspaces available" : "Select workspace..."} />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((w) => (
              <SelectItem key={w.slug} value={w.slug}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <Button variant="outline" onClick={jump} disabled={loading || empty}>
        Go to workspace
      </Button>
    </div>
  );
}


