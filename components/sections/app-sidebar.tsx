"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle, ChevronsUpDown, Truck } from "lucide-react";
import { NavItem, NavMain } from "./main-nav";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps {
  items: NavItem[];
  title: string;
  logoUrl?: string | null;
  roleLabel: string;
  userLabel: string;
  context?: "platform" | "tenant-admin" | "client";
  enabledModules?: string[];
}

export function AppSidebar({ items, title, logoUrl, roleLabel, userLabel, context, enabledModules }: AppSidebarProps) {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const isFleet = pathname?.startsWith("/admin/fleet");
  const moduleName = isFleet ? "Fleet Management" : "Station Management";

  const showStationSwitch = context !== "platform" && (!enabledModules || enabledModules.includes("operations") || enabledModules.includes("stations"));
  const showFleetSwitch = context !== "platform" && (!enabledModules || enabledModules.includes("fleet"));
  const showDropdown = context !== "platform" && (showStationSwitch && showFleetSwitch);

  return (
    <Sidebar className="px-0 h-full [&_[data-slot=sidebar-inner]]:h-full">
      <div className="flex flex-col gap-4">
        {/* ---------------- Header ---------------- */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              {showDropdown ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="bg-muted/40 hover:bg-muted/60 dark:bg-muted/20 dark:hover:bg-muted/30 border border-border/50 transition-colors data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
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
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
                    align="start"
                    side={isMobile ? "bottom" : "right"}
                    sideOffset={4}
                  >
                    <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                      Features
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {showStationSwitch && (
                      <Link href="/admin/dashboard" className="w-full">
                        <DropdownMenuItem className="cursor-pointer gap-2 p-2">
                          <div className="flex size-6 items-center justify-center rounded-md border">
                            <Image src="/assets/icons/gps.png" alt="Station" width={14} height={14} className="shrink-0" />
                          </div>
                          Station Management
                          <DropdownMenuShortcut>⌘1</DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </Link>
                    )}
                    {showFleetSwitch && (
                      <Link href="/admin/fleet" className="w-full">
                        <DropdownMenuItem className="cursor-pointer gap-2 p-2">
                          <div className="flex size-6 items-center justify-center rounded-md border">
                            <Image src="/assets/icons/gas-truck.png" alt="Fleet" width={14} height={14} className="shrink-0" />
                          </div>
                          Fleet Management
                          <DropdownMenuShortcut>⌘2</DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </Link>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
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
