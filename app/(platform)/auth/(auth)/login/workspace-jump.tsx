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
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Tick02Icon } from "@hugeicons/core-free-icons";

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
    window.location.assign(`${protocol}//${slug}.${host}/`);
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
              className="w-full justify-between"
              disabled={loading || empty}
            >
              {slug
                ? workspaces.find((w) => w.slug === slug)?.name
                : loading
                ? "Loading…"
                : empty
                ? "No workspaces available"
                : "Select workspace..."}
              <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className="opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
            <Command>
              <CommandInput placeholder="Search workspace..." />
              <CommandList>
                <CommandEmpty>No workspace found.</CommandEmpty>
                <CommandGroup>
                  {workspaces.map((w) => (
                    <CommandItem
                      key={w.slug}
                      value={w.slug}
                      keywords={[w.name]}
                      onSelect={(currentValue) => {
                        setSlug(currentValue === slug ? "" : currentValue);
                        setError(null);
                        setOpen(false);
                      }}
                    >
                      {w.name}
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        strokeWidth={2}
                        className={cn(
                          "ml-auto",
                          slug === w.slug ? "opacity-100" : "opacity-0"
                        )}
                      />
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


