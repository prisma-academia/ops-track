"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  PieChart,
  Building2,
  Building,
  CircleUserRound,
  Shield,
  ClipboardList,
  Activity,
  Settings,
  BookOpen,
  MapPin,
  Truck,
  Coins,
  Users,
  TrendingUp,
  Gauge,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  PieChart,
  Building2,
  Building,
  CircleUserRound,
  Shield,
  ClipboardList,
  Activity,
  Settings,
  BookOpen,
  MapPin,
  Truck,
  Coins,
  Users,
  TrendingUp,
  Gauge,
  AlertCircle,
};

export type NavItem = {
  label?: string;
  isSection?: boolean;
  title?: string;
  icon?: React.ComponentType<{ size?: number }> | string;
  href?: string;
  children?: NavItem[];
};

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  const [activeParent, setActiveParent] = React.useState<string | null>(null);
  const [activeChild, setActiveChild] = React.useState<string | null>(null);

  // Update active states based on pathname
  React.useEffect(() => {
    items.forEach((item) => {
      if (item.href === pathname) {
        setActiveParent(item.title || null);
        setActiveChild(null);
      }
      item.children?.forEach((child) => {
        if (child.href === pathname) {
          setActiveParent(item.title || null);
          setActiveChild(child.title || null);
        }
      });
    });
  }, [pathname, items]);

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, index) => (
        <NavMainItem
          key={item.title || item.label || index}
          item={item}
          activeParent={activeParent}
          setActiveParent={setActiveParent}
          activeChild={activeChild}
          setActiveChild={setActiveChild}
        />
      ))}
    </div>
  );
}

function NavMainItem({
  item,
  activeParent,
  setActiveParent,
  activeChild,
  setActiveChild,
}: {
  item: NavItem;
  activeParent: string | null;
  activeChild: string | null;
  setActiveParent: (val: string) => void;
  setActiveChild: (val: string | null) => void;
}) {
  const hasChildren = !!item.children?.length;
  const isParentActive = activeParent === item.title;
  const [isOpen, setIsOpen] = React.useState(isParentActive);
  const [prevIsParentActive, setPrevIsParentActive] = React.useState(isParentActive);

  if (isParentActive !== prevIsParentActive) {
    setPrevIsParentActive(isParentActive);
    if (isParentActive) {
      setIsOpen(true);
    }
  }

  // Section label
  if (item.isSection && item.label) {
    return (
      <SidebarGroup className="p-0 py-0 first:pt-0">
        <SidebarGroupLabel className="p-0 py-1 text-xs font-medium capitalize text-sidebar-foreground">
          {item.label}
        </SidebarGroupLabel>
      </SidebarGroup>
    );
  }

  const Icon = typeof item.icon === "string" ? iconMap[item.icon] : item.icon;

  // Item with children → collapsible
  if (hasChildren && item.title) {
    return (
      <SidebarGroup className="p-0">
        <SidebarMenu>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  id={`nav-main-trigger-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  tooltip={item.title}
                  isActive={isParentActive}
                  onClick={() => {
                    setActiveParent(item.title!);
                    setIsOpen(!isOpen);
                  }}
                  className={cn(
                    "rounded-none text-sm font-medium px-3 py-4 h-10 transition-colors cursor-pointer",
                    isParentActive ? "bg-primary! text-primary-foreground!" : ""
                  )}
                >
                  {Icon && <Icon size={22} />}
                  <span>{item.title}</span>
                  <ChevronRight
                    className={cn(
                      "ml-auto transition-transform duration-200",
                      isOpen && "rotate-90"
                    )}
                  />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub className="me-0 pe-0">
                  {item.children!.map((child, index) => (
                    <NavMainSubItem
                      key={child.title || index}
                      item={child}
                      activeParent={activeParent}
                      setActiveParent={setActiveParent}
                      activeChild={activeChild}
                      setActiveChild={setActiveChild}
                      parentTitle={item.title}
                    />
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  // Item without children
  if (item.title) {
    return (
      <SidebarGroup className="p-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              id={`nav-main-button-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              tooltip={item.title}
              isActive={isParentActive}
              onClick={() => {
                setActiveParent(item.title!);
                setActiveChild(null);
              }}
              className={cn(
                "rounded-none text-sm font-medium px-3 py-4 h-10 transition-colors cursor-pointer",
                isParentActive ? "bg-primary! text-primary-foreground!" : ""
              )}
            >
              <Link href={item.href || "#"} className="flex items-center gap-3">
                {Icon && <Icon size={18} />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  return null;
}


function NavMainSubItem({
  item,
  activeParent,
  setActiveParent,
  activeChild,
  setActiveChild,
  parentTitle,
}: {
  item: NavItem;
  activeParent: string | null;
  activeChild: string | null;
  setActiveParent: (val: string) => void;
  setActiveChild: (val: string | null) => void;
  parentTitle?: string;
}) {
  const Icon = typeof item.icon === "string" ? iconMap[item.icon] : item.icon;
  const hasChildren = !!item.children?.length;
  const [isOpen, setIsOpen] = React.useState(false);

  if (hasChildren && item.title) {
    return (
      <SidebarMenuSubItem>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <SidebarMenuSubButton
              id={`nav-sub-trigger-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              className="rounded-none text-sm font-medium px-3 py-2 h-9"
            >
              {Icon && <Icon />}
              <span>{item.title}</span>
              <ChevronRight
                className={cn(
                  "ml-auto transition-transform duration-200",
                  isOpen && "rotate-90"
                )}
              />
            </SidebarMenuSubButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub className="me-0 pe-0">
              {item.children!.map((child, index) => (
                <NavMainSubItem
                  key={child.title || index}
                  item={child}
                  activeParent={activeParent}
                  setActiveParent={setActiveParent}
                  activeChild={activeChild}
                  setActiveChild={setActiveChild}
                  parentTitle={parentTitle}
                />
              ))}
            </SidebarMenuSub>
          </CollapsibleContent>
        </Collapsible>
      </SidebarMenuSubItem>
    );
  }

  if (item.title) {
    return (
      <SidebarMenuSubItem className="w-full">
        <SidebarMenuSubButton
          asChild
          id={`nav-sub-button-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
          className={cn(
            "w-full rounded-none py-5 h-10 transition-colors",
            activeChild === item.title ? "bg-muted! text-foreground!" : ""
          )}
          isActive={activeChild === item.title}
          onClick={() => {
            setActiveParent(parentTitle || "");
            setActiveChild(item.title!);
          }}
        >
          <Link href={item.href || "#"} className="flex items-center w-full px-2">
            {item.title}
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return null;
}
