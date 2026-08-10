"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, Truck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FleetAssetsTabsProps {
  activeTab: string;
  counts: {
    transporters: number;
    trucks: number;
    drivers: number;
  };
}

export function FleetAssetsTabs({ activeTab, counts }: FleetAssetsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTabChange = (tabValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabValue);
    // Reset page parameter on tab switch
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const tabs = [
    {
      id: "transporters",
      title: "Transporters",
      description: "Logistics companies & transport partners",
      icon: Building2,
      count: counts.transporters,
    },
    {
      id: "trucks",
      title: "Trucks",
      description: "Registered fleet vehicles & haulage capacity",
      icon: Truck,
      count: counts.trucks,
    },
    {
      id: "drivers",
      title: "Drivers",
      description: "Licensed drivers & logistics operators",
      icon: Users,
      count: counts.drivers,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-primary/50 bg-primary/5 shadow-xs dark:bg-primary/10"
                : "border-border/60 bg-card hover:bg-accent/40 hover:border-border"
            )}
          >
            <div
              className={cn(
                "p-2.5 rounded-lg shrink-0 transition-colors duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground group-hover:bg-accent-foreground/10 group-hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "font-semibold text-base leading-snug transition-colors",
                    isActive ? "text-primary" : "text-foreground"
                  )}
                >
                  {tab.title}
                </span>
                <Badge
                  variant={isActive ? "default" : "secondary"}
                  className={cn(
                    "font-mono text-xs px-2 py-0.5 shrink-0",
                    isActive ? "bg-primary/90 text-primary-foreground" : "text-muted-foreground"
                  )}
                >
                  {tab.count}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-normal leading-relaxed">
                {tab.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
