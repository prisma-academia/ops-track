"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Receipt, Truck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function LedgerTabs() {
  const pathname = usePathname();

  const tabs = [
    {
      id: "deliveries",
      title: "Deliveries Ledger",
      description: "Customer deliveries transactions, payments & balances",
      icon: Receipt,
      href: "/admin/fleet/ledger/deliveries",
    },
    {
      id: "transports",
      title: "Transport Ledger",
      description: "Transporter trip records, freight fees & deductions",
      icon: Truck,
      href: "/admin/fleet/ledger/transports",
    },
    {
      id: "expenses",
      title: "Expenses Ledger",
      description: "Fleet maintenance, operational costs & deductions",
      icon: Wallet,
      href: "/admin/fleet/ledger/expenses",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname.startsWith(tab.href) || pathname === tab.href;

        return (
          <Link
            key={tab.id}
            href={tab.href}
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
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-normal leading-relaxed">
                {tab.description}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
