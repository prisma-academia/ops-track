"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { useState, useMemo } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle, ChevronsUpDown, Truck } from "lucide-react";
import { NavItem, NavMain } from "./main-nav";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function isStationAdminPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/admin/station" || pathname.startsWith("/admin/station/");
}


interface AppSidebarProps {
  items: NavItem[];
  title: string;
  logoUrl?: string | null;
  roleLabel: string;
  userLabel: string;
  context?: "platform" | "tenant-admin" | "client";
  enabledModules?: string[];
  stations?: { id: string; name: string; code: string; organization?: { name: string | null; slug: string | null; logoUrl: string | null; type: string | null } }[];
  tenant?: { name: string; slug: string; logoUrl: string | null };
  internalOrganizations?: { id: string; name: string; slug: string | null; logoUrl: string | null }[];
}

export function AppSidebar({ items, title, logoUrl, roleLabel, userLabel, context, enabledModules, stations = [], tenant, internalOrganizations: explicitInternalOrgs }: AppSidebarProps) {
  const { isMobile } = useSidebar();
  const [openCommand, setOpenCommand] = useState(false);
  const pathname = usePathname();
  const isFleet =
    !!pathname?.startsWith("/admin") &&
    !pathname.startsWith("/admin/auth") &&
    !isStationAdminPath(pathname);
  const moduleName = isFleet ? "Fleet Management" : "Station Management";

  const showStationSwitch = context !== "platform" && (!enabledModules || enabledModules.includes("operations") || enabledModules.includes("stations") || enabledModules.includes("station"));
  const showFleetSwitch = context !== "platform" && (!enabledModules || enabledModules.includes("fleet"));
  const showDropdown = context !== "platform" && (showStationSwitch && showFleetSwitch);
  
  const internalOrganizations = useMemo(() => {
    if (explicitInternalOrgs && explicitInternalOrgs.length > 0) {
      return explicitInternalOrgs;
    }

    const orgMap = new Map<string, { id: string; name: string; slug: string | null; logoUrl: string | null }>();
    
    for (const s of stations) {
      if (s.organization && s.organization.type === "INTERNAL" && s.organization.name) {
        const key = s.organization.name;
        if (!orgMap.has(key)) {
          // Fallback to storing the first station's ID as the organization "id" for switching
          orgMap.set(key, {
            id: s.id,
            name: s.organization.name,
            slug: s.organization.slug || null,
            logoUrl: s.organization.logoUrl || null,
          });
        }
      }
    }
    
    return Array.from(orgMap.values());
  }, [stations, explicitInternalOrgs]);

  return (
    <Sidebar className="px-0 h-full [&_[data-slot=sidebar-inner]]:h-full">
      <div className="flex flex-col gap-4">
        {/* ---------------- Header ---------------- */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {showDropdown ? (
                <>
                  <SidebarMenuButton
                    size="lg"
                    onClick={() => setOpenCommand(true)}
                    className="bg-muted/40 hover:bg-muted/60 dark:bg-muted/20 dark:hover:bg-muted/30 border border-border/50 transition-colors"
                  >
                    {logoUrl ? (
                      <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-md border border-border/40 bg-background">
                        <img
                          src={logoUrl}
                          alt={`${title} Logo`}
                          className="size-8 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square size-8 items-center justify-center rounded-md border border-border/40 bg-primary/10 text-primary">
                        <Building2 className="size-4" />
                      </div>
                    )}
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{title}</span>
                      <span className="truncate text-xs text-muted-foreground">{moduleName}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>

                  <CommandDialog open={openCommand} onOpenChange={setOpenCommand} title="Switch Module" description="Select a module or organization">
                    <Command>
                      <CommandInput placeholder="Search organization or module..." />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        {showFleetSwitch && (
                          <CommandGroup heading="Fleet Organisation">
                            <CommandItem 
                              onSelect={() => { setOpenCommand(false); window.location.href = "/admin"; }}
                              className="flex items-center gap-2.5 py-2 cursor-pointer"
                            >
                              {tenant?.logoUrl ? (
                                <img src={tenant.logoUrl} alt="" className="h-8 w-8 object-contain" />
                              ) : (
                                <Truck className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="flex flex-col flex-1">
                                <span className="font-extrabold">{tenant?.name ?? "Admin Fleet"}</span>
                                {tenant?.slug && (
                                  <span className="text-sm text-muted-foreground">{tenant.slug}</span>
                                )}
                              </div>
                              {isFleet && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
                            </CommandItem>
                          </CommandGroup>
                        )}
                        {showStationSwitch && internalOrganizations.length > 0 && (
                          <CommandGroup heading="Managed Organisation">
                            {internalOrganizations.map((org) => {
                              const isActiveOrg = !isFleet && org.name === title;
                              return (
                                <CommandItem 
                                  key={org.slug || org.name} 
                                  onSelect={() => {
                                    setOpenCommand(false);
                                    // Setting active-org-id or if it expects a station, we just pass the ID.
                                    // The dashboard layout will handle if the ID belongs to an org.
                                    document.cookie = `active-station-id=${org.id}; path=/;`;
                                    window.location.href = "/admin/station";
                                  }}
                                  className="flex items-center gap-2.5 py-2 cursor-pointer"
                                >
                                  {org.logoUrl ? (
                                    <img src={org.logoUrl} alt="" className="h-8 w-8 object-contain" />
                                  ) : (
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <div className="flex flex-col flex-1">
                                    <span className="font-extrabold">{org.name}</span>
                                    {org.slug && (
                                      <span className="text-sm text-muted-foreground">{org.slug}</span>
                                    )}
                                  </div>
                                  {isActiveOrg && <CheckCircle className="ml-auto h-4 w-4 text-primary" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </CommandDialog>
                </>
              ) : (
                <SidebarMenuButton
                  size="lg"
                  className="bg-muted/40 hover:bg-muted/60 dark:bg-muted/20 dark:hover:bg-muted/30 border border-border/50 transition-colors"
                >
                  {logoUrl && (
                    <div className="flex aspect-square size-8 items-center justify-center overflow-hidden">
                      <img
                        src={logoUrl}
                        alt={`${title} Logo`}
                        className="size-8 object-contain"
                      />
                    </div>
                  )}
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {context === "platform" ? "Platform Administration" : moduleName}
                    </span>
                  </div>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* ---------------- Content ---------------- */}
        <SidebarContent className="overflow-hidden">
          <ScrollArea className="h-[calc(100vh-100px)]">
            <div className="px-4">
              <NavMain items={items} />
            </div>
          </ScrollArea>
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
