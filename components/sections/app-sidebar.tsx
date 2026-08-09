"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { useState } from "react";
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
}

export function AppSidebar({ items, title, logoUrl, roleLabel, userLabel, context, enabledModules, stations = [], tenant }: AppSidebarProps) {
  const { isMobile } = useSidebar();
  const [openCommand, setOpenCommand] = useState(false);
  const pathname = usePathname();
  const isFleet = pathname?.startsWith("/admin/fleet");
  const moduleName = isFleet ? "Fleet Management" : "Station Management";

  const showStationSwitch = context !== "platform" && (!enabledModules || enabledModules.includes("operations") || enabledModules.includes("stations"));
  const showFleetSwitch = context !== "platform" && (!enabledModules || enabledModules.includes("fleet"));
  const showDropdown = context !== "platform" && (showStationSwitch && showFleetSwitch);
  
  const internalStations = stations.filter(s => s.organization?.type === "INTERNAL");

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
                      <span className="truncate text-xs text-muted-foreground">{moduleName}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>

                  <CommandDialog open={openCommand} onOpenChange={setOpenCommand} title="Switch Module" description="Select a module or station">
                    <Command>
                      <CommandInput placeholder="Search station or module..." />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        {showFleetSwitch && (
                          <CommandGroup heading="Modules">
                            <CommandItem 
                              onSelect={() => { setOpenCommand(false); window.location.href = "/admin/fleet"; }}
                              className="flex items-center gap-2.5 py-2"
                            >
                              {tenant?.logoUrl ? (
                                <img src={tenant.logoUrl} alt="" className="h-5 w-5 object-contain" />
                              ) : (
                                <Truck className="h-4 w-4 text-muted-foreground" />
                              )}
                              <div className="flex flex-col">
                                <span className="font-extrabold">{tenant?.name ?? "Admin Fleet"}</span>
                                {tenant?.slug && (
                                  <span className="text-sm text-muted-foreground">{tenant.slug}</span>
                                )}
                              </div>
                            </CommandItem>
                          </CommandGroup>
                        )}
                        {showStationSwitch && internalStations.length > 0 && (
                          <CommandGroup heading="Internal Stations">
                            {internalStations.map((station) => (
                              <CommandItem 
                                key={station.id} 
                                onSelect={() => {
                                  setOpenCommand(false);
                                  window.location.href = "/admin/dashboard";
                                }}
                                className="flex items-center gap-2.5 py-2"
                              >
                                {station.organization?.logoUrl ? (
                                  <img src={station.organization.logoUrl} alt="" className="h-5 w-5 object-contain" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-extrabold">{station.organization?.name || station.name}</span>
                                  {station.organization?.slug && (
                                    <span className="text-sm text-muted-foreground">{station.organization.slug}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
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
