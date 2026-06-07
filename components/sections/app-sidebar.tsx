"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { Building2 } from "lucide-react";
import { NavItem, NavMain } from "./main-nav";

interface AppSidebarProps {
  items: NavItem[];
  title: string;
  roleLabel: string;
  userLabel: string;
}

export function AppSidebar({ items, title, roleLabel, userLabel }: AppSidebarProps) {
  return (
    <Sidebar className="px-0 h-full [&_[data-slot=sidebar-inner]]:h-full">
      <div className="flex flex-col gap-6">
        {/* ---------------- Header ---------------- */}
        <SidebarHeader className="px-4 pt-3">
          <div className="w-full p-2 border rounded-xl bg-muted/20">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary shrink-0">
                <Building2 className="size-4" />
              </div>
              <div className="flex flex-col items-start truncate min-w-0">
                <span className="text-sm font-semibold font-heading truncate w-full text-left">{title}</span>
                <span className="text-xs text-muted-foreground font-normal truncate">{roleLabel}</span>
              </div>
            </div>
          </div>
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
