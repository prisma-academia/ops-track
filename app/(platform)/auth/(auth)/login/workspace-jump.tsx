"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

type Workspace = { slug: string; name: string };

export function WorkspaceJumpForm() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="ws-slug"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between bg-input/30 font-normal",
                !slug && "text-muted-foreground"
              )}
              disabled={loading || empty}
            >
              {slug
                ? workspaces.find((w) => w.slug === slug)?.name
                : loading
                ? "Loading…"
                : empty
                ? "No workspaces available"
                : "Select workspace..."}
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="size-4 shrink-0 text-muted-foreground opacity-50"
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search workspace..." />
              <CommandList>
                <CommandEmpty>No workspace found.</CommandEmpty>
                <CommandGroup>
                  {workspaces.map((w) => (
                    <CommandItem
                      key={w.slug}
                      value={`${w.name} ${w.slug}`}
                      onSelect={() => {
                        setSlug(w.slug);
                        setError(null);
                        setOpen(false);
                      }}
                    >
                      {w.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </FormField>
      <Button variant="outline" onClick={jump} disabled={loading || empty}>
        Go to workspace
      </Button>
    </div>
  );
}

