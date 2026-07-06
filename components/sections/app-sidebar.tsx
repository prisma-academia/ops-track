"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle, ChevronDown, Truck } from "lucide-react";
import { NavItem, NavMain } from "./main-nav";
import Image from 'next/image';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AppSidebarProps {
  items: NavItem[];
  title: string;
  logoUrl?: string | null;
  roleLabel: string;
  userLabel: string;
}

export function AppSidebar({ items, title, logoUrl, roleLabel, userLabel }: AppSidebarProps) {
  return (
    <Sidebar className="px-0 h-full [&_[data-slot=sidebar-inner]]:h-full">
      <div className="flex flex-col gap-4">
        {/* ---------------- Header ---------------- */}
        <SidebarHeader className="px-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20">
              <div className="flex items-center gap-3 overflow-hidden p-2">
                <div className="flex items-center justify-center size-10 rounded-lg text-primary shrink-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${title} Logo`}
                      className="size-10 rounded-md object-contain bg-white"
                    />
                  ) : (
                    <Image
                      src="/assets/icons/asa-oil-logo.png"
                      alt="ASA Oil Logo"
                      width={40}
                      height={40}
                      className="rounded-md"
                    />
                  )}
                </div>
                <div className="flex flex-col items-start truncate min-w-0 flex-1">
                  <span className="text-sm font-semibold font-heading truncate w-full text-left">{title}</span>
    
                </div>
                <ChevronDown className="size-4 text-muted-foreground shrink-0 mr-1" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">Modules</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/admin/dashboard" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                  <Image src="/assets/icons/gps.png" alt="Fleet" width={30} height={30} />
                  <span>Station Management</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/admin/fleet" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                  <Image src="/assets/icons/gas-truck.png" alt="Fleet" width={30} height={30} />
                  <span>Fleet Management</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
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
