"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Building2, CheckCircle } from "lucide-react";
import { NavItem, NavMain } from "./main-nav";
import Image from 'next/image';

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
          <div className="w-full border rounded-md bg-muted/20">
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
              <div className="flex flex-col items-start truncate min-w-0">
                <span className="text-sm font-semibold font-heading truncate w-full text-left">{title}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="secondary" className="px-1.5 py-0 rounded text-[10px] h-4 font-medium flex items-center gap-1">
                    <CheckCircle className="size-2.5 text-primary" />
                    Premium
                  </Badge>
                </div>
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
