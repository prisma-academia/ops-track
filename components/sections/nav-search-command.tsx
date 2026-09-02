"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  flattenNavForSearch,
  resolveNavIcon,
  type NavItem,
  type SearchNavEntry,
} from "@/components/sections/main-nav";

function isStationAdminPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/admin/station" || pathname.startsWith("/admin/station/");
}

function navModuleLabel(pathname: string | null): "Fleet" | "Station" | "Platform" | "Pages" {
  if (!pathname) return "Pages";
  if (isStationAdminPath(pathname)) return "Station";
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/auth")) return "Fleet";
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/tenants") || pathname.startsWith("/users")) {
    return "Platform";
  }
  return "Pages";
}

function groupEntries(entries: SearchNavEntry[], moduleLabel: string) {
  const grouped = new Map<string, SearchNavEntry[]>();
  for (const entry of entries) {
    const heading = entry.group === "Pages" ? moduleLabel : entry.group;
    const list = grouped.get(heading) ?? [];
    list.push(entry);
    grouped.set(heading, list);
  }
  return Array.from(grouped.entries());
}

interface NavSearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navItems: NavItem[];
}

export function NavSearchCommand({ open, onOpenChange, navItems }: NavSearchCommandProps) {
  const router = useRouter();
  const pathname = usePathname();
  const moduleLabel = navModuleLabel(pathname);

  const groups = useMemo(() => {
    const entries = flattenNavForSearch(navItems, moduleLabel);
    return groupEntries(entries, moduleLabel);
  }, [navItems, moduleLabel]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 border-none sm:max-w-xl gap-0 overflow-hidden shadow-lg"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Search {moduleLabel} pages</DialogTitle>
        <Command className="rounded-none">
          <CommandInput
            placeholder={`Search ${moduleLabel.toLowerCase()} pages...`}
            autoFocus
          />
          <CommandList className="max-h-[min(420px,70vh)]">
            <CommandEmpty>No pages found.</CommandEmpty>
            {groups.map(([heading, items]) => (
              <CommandGroup key={heading} heading={heading}>
                {items.map((item) => {
                  const Icon = resolveNavIcon(item.icon);
                  return (
                    <CommandItem
                      key={item.href}
                      value={`${item.title} ${heading} ${item.href}`}
                      onSelect={() => {
                        onOpenChange(false);
                        router.push(item.href);
                      }}
                    >
                      {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
                      <span>{item.title}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
