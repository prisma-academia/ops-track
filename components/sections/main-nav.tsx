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
  Activity01Icon,
  Activity02Icon,
  Alert01Icon,
  Analytics01Icon,
  AnalyticsUpIcon,
  BankIcon,
  Building01Icon,
  Building02Icon,
  CreditCardIcon,
  DashboardSquare01Icon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FuelStationIcon,
  Invoice01Icon,
  Invoice02Icon,
  MapPinIcon,
  Notification01Icon,
  ReceiptDollarIcon,
  Settings01Icon,
  Shield01Icon,
  ShieldCheckIcon,
  ShoppingCart01Icon,
  SteeringIcon,
  Store01Icon,
  TableIcon,
  TankerTruckIcon,
  Ticket01Icon,
  TruckDeliveryIcon,
  TruckIcon,
  UserAccountIcon,
  UserGroup02Icon,
  UserGroupIcon,
  Wallet01Icon,
  Wallet02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Activity,
  AlertCircle,
  BadgeDollarSign,
  Banknote,
  BookOpen,
  Building,
  Building2,
  ChartNoAxesCombined,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  Coins,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Gauge,
  Inbox,
  Landmark,
  LayoutDashboard,
  MapPin,
  Network,
  PieChart,
  Route,
  Scale,
  Settings,
  Shield,
  ShoppingCart,
  Ticket,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import * as React from "react";

export function createHugeIcon(icon: IconSvgElement) {
  const Component = React.forwardRef<
    SVGSVGElement,
    { size?: number | string; className?: string; strokeWidth?: number }
  >((props, ref) => (
    <HugeiconsIcon
      ref={ref}
      icon={icon}
      size={props.size ?? 20}
      strokeWidth={props.strokeWidth ?? 2}
      className={cn("shrink-0", props.className)}
    />
  ));
  Component.displayName = "HugeIcon";
  return Component;
}

function hrefMatchesNav(
  href: string | undefined,
  pathname: string | null,
  searchParams: URLSearchParams
): boolean {
  if (!href || !pathname || href === "#") return false;

  const [path, query] = href.split("?");
  const pathMatches = pathname === path || pathname.startsWith(`${path}/`);
  if (!pathMatches) return false;

  if (!query) return true;

  const expected = new URLSearchParams(query);
  for (const [key, value] of expected.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

export const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  // Lucide icons
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
  ChartNoAxesCombined,
  FileText,
  Scale,
  FileSpreadsheet,
  LayoutDashboard,
  ShoppingCart,
  Route,
  BadgeDollarSign,
  Wallet,
  CreditCard,
  Banknote,
  Landmark,
  Ticket,
  Network,
  Inbox,

  // Hugeicons Free Icons
  DashboardSquare01Icon: createHugeIcon(DashboardSquare01Icon),
  ShoppingCart01Icon: createHugeIcon(ShoppingCart01Icon),
  TankerTruckIcon: createHugeIcon(TankerTruckIcon),
  ReceiptDollarIcon: createHugeIcon(ReceiptDollarIcon),
  CreditCardIcon: createHugeIcon(CreditCardIcon),
  Analytics01Icon: createHugeIcon(Analytics01Icon),
  AnalyticsUpIcon: createHugeIcon(AnalyticsUpIcon),
  FileTextIcon: createHugeIcon(FileTextIcon),
  FileSpreadsheetIcon: createHugeIcon(FileSpreadsheetIcon),
  Store01Icon: createHugeIcon(Store01Icon),
  TruckDeliveryIcon: createHugeIcon(TruckDeliveryIcon),
  TruckIcon: createHugeIcon(TruckIcon),
  Wallet01Icon: createHugeIcon(Wallet01Icon),
  Wallet02Icon: createHugeIcon(Wallet02Icon),
  BankIcon: createHugeIcon(BankIcon),
  Building01Icon: createHugeIcon(Building01Icon),
  Building02Icon: createHugeIcon(Building02Icon),
  FuelStationIcon: createHugeIcon(FuelStationIcon),
  UserGroupIcon: createHugeIcon(UserGroupIcon),
  UserGroup02Icon: createHugeIcon(UserGroup02Icon),
  UserAccountIcon: createHugeIcon(UserAccountIcon),
  SteeringIcon: createHugeIcon(SteeringIcon),
  Settings01Icon: createHugeIcon(Settings01Icon),
  Shield01Icon: createHugeIcon(Shield01Icon),
  ShieldCheckIcon: createHugeIcon(ShieldCheckIcon),
  Activity01Icon: createHugeIcon(Activity01Icon),
  Activity02Icon: createHugeIcon(Activity02Icon),
  Alert01Icon: createHugeIcon(Alert01Icon),
  TableIcon: createHugeIcon(TableIcon),
  Notification01Icon: createHugeIcon(Notification01Icon),
  Ticket01Icon: createHugeIcon(Ticket01Icon),
  Invoice01Icon: createHugeIcon(Invoice01Icon),
  Invoice02Icon: createHugeIcon(Invoice02Icon),
  MapPinIcon: createHugeIcon(MapPinIcon),

  // Tabler Aliases mapped to Hugeicons free equivalents for complete compatibility
  IconLayoutDashboard: createHugeIcon(DashboardSquare01Icon),
  IconBuilding: createHugeIcon(Building01Icon),
  IconUsers: createHugeIcon(UserGroupIcon),
  IconUsersGroup: createHugeIcon(UserGroupIcon),
  IconUser: createHugeIcon(UserAccountIcon),
  IconShield: createHugeIcon(Shield01Icon),
  IconTruck: createHugeIcon(TruckDeliveryIcon),
  IconShoppingCart: createHugeIcon(ShoppingCart01Icon),
  IconGasStation: createHugeIcon(FuelStationIcon),
  IconMapPin: createHugeIcon(MapPinIcon),
  IconReceiptDollar: createHugeIcon(ReceiptDollarIcon),
  IconCreditCard: createHugeIcon(CreditCardIcon),
  IconBuildingBank: createHugeIcon(BankIcon),
  IconReportAnalytics: createHugeIcon(Analytics01Icon),
  IconFileText: createHugeIcon(FileTextIcon),
  IconWallet: createHugeIcon(Wallet01Icon),
  IconActivity: createHugeIcon(Activity01Icon),
  IconSettings: createHugeIcon(Settings01Icon),
  IconBuildingStore: createHugeIcon(Store01Icon),
  IconTicket: createHugeIcon(Ticket01Icon),
  IconTable: createHugeIcon(TableIcon),
  IconAlertTriangle: createHugeIcon(Shield01Icon),
  IconBell: createHugeIcon(Notification01Icon),
};

export type NavItem = {
  label?: string;
  isSection?: boolean;
  title?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }> | string;
  href?: string;
  children?: NavItem[];
};

export type SearchNavEntry = {
  title: string;
  href: string;
  icon?: NavItem["icon"];
  group: string;
};

export function resolveNavIcon(icon?: NavItem["icon"]) {
  if (!icon) return undefined;
  return typeof icon === "string" ? iconMap[icon] : icon;
}

function collectNavEntries(
  items: NavItem[],
  group: string,
  acc: SearchNavEntry[],
  inheritedIcon?: NavItem["icon"]
) {
  for (const item of items) {
    if (item.isSection && item.label) {
      group = item.label;
      continue;
    }

    const icon = item.icon ?? inheritedIcon;

    if (item.children?.length) {
      collectNavEntries(item.children, item.title || group, acc, icon);
      continue;
    }

    if (item.title && item.href && item.href !== "#") {
      acc.push({
        title: item.title,
        href: item.href,
        icon,
        group,
      });
    }
  }
}

export function flattenNavForSearch(items: NavItem[], defaultGroup = "Pages"): SearchNavEntry[] {
  const acc: SearchNavEntry[] = [];
  collectNavEntries(items, defaultGroup, acc);
  return acc;
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [activeParent, setActiveParent] = React.useState<string | null>(null);
  const [activeChild, setActiveChild] = React.useState<string | null>(null);

  // Update active states based on pathname
  React.useEffect(() => {
    items.forEach((item) => {
      if (hrefMatchesNav(item.href, pathname, searchParams)) {
        setActiveParent(item.title || null);
        setActiveChild(null);
      }
      item.children?.forEach((child) => {
        if (hrefMatchesNav(child.href, pathname, searchParams)) {
          setActiveParent(item.title || null);
          setActiveChild(child.title || null);
        }
      });
    });
  }, [pathname, searchParams, items]);

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

function NavIconBadge({
  icon: Icon,
  isActive = false,
  isSubItem = false,
  className,
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  isActive?: boolean;
  isSubItem?: boolean;
  className?: string;
}) {
  if (!Icon) return null;

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg transition-all duration-200",
        isSubItem ? "size-6" : "size-7",
        isActive
          ? isSubItem
            ? "bg-primary text-primary-foreground shadow-xs border border-primary/40"
            : "bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/20 shadow-xs"
          : isSubItem
            ? "bg-sidebar-accent/50 text-sidebar-foreground/60 border border-sidebar-border/40 group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
            : "bg-sidebar-accent/80 text-sidebar-foreground/70 border border-sidebar-border/60 group-hover/menu-button:bg-sidebar-accent group-hover/menu-button:text-sidebar-foreground group-hover/menu-button:border-sidebar-border",
        className
      )}
    >
      <Icon
        size={isSubItem ? 14 : 17}
        className={cn(
          "shrink-0 text-current",
          isSubItem ? "size-3.5" : "size-[17px]"
        )}
      />
    </span>
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
                    "rounded-full text-sm font-medium px-2 py-4 h-10 transition-colors cursor-pointer gap-2.5",
                    isParentActive ? "bg-primary! text-primary-foreground!" : ""
                  )}
                >
                  <NavIconBadge icon={Icon} isActive={isParentActive} />
                  <span>{item.title}</span>
                  <ChevronRight
                    className={cn(
                      "ml-auto transition-transform duration-200 size-4",
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
                "rounded-full text-sm font-medium px-2 py-4 h-10 transition-colors cursor-pointer",
                isParentActive ? "bg-primary! text-primary-foreground!" : ""
              )}
            >
              <Link href={item.href || "#"} className="flex items-center gap-2.5">
                <NavIconBadge icon={Icon} isActive={isParentActive} />
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
              className="rounded-full text-sm font-medium px-3 py-2 h-9 gap-2.5"
            >
              <NavIconBadge icon={Icon} isActive={false} isSubItem />
              <span>{item.title}</span>
              <ChevronRight
                className={cn(
                  "ml-auto transition-transform duration-200 size-4",
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
    const isSubActive = activeChild === item.title;
    return (
      <SidebarMenuSubItem className="w-full">
        <SidebarMenuSubButton
          asChild
          id={`nav-sub-button-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
          className={cn(
            "w-full rounded-full py-5 h-10 transition-colors",
            isSubActive ? "bg-muted! text-foreground!" : ""
          )}
          isActive={isSubActive}
          onClick={() => {
            setActiveParent(parentTitle || "");
            setActiveChild(item.title!);
          }}
        >
          <Link href={item.href || "#"} className="flex items-center w-full px-2 gap-2.5">
            <NavIconBadge icon={Icon} isActive={isSubActive} isSubItem />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuSubButton>
      </SidebarMenuSubItem>
    );
  }

  return null;
}
