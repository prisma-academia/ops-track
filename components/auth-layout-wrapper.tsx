"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Star, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANY_NAME } from "@/lib/branding";
import { CompanyLogo } from "@/components/brand/company-logo";
import { PoweredBy } from "@/components/brand/powered-by";

/* ------------------------------------------------------------------ */
/*  Currency selector                                                  */
/* ------------------------------------------------------------------ */
const CURRENCIES = [
  { code: "NGN", symbol: "₦", label: "Naira" },
  { code: "USD", symbol: "$", label: "Dollar" },
  { code: "GBP", symbol: "£", label: "Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
];

function CurrencySelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(CURRENCIES[0]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted cursor-pointer"
      >
        <span className="font-medium">{selected.symbol}</span>
        <span>{selected.code}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setSelected(c);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted cursor-pointer ${
                selected.code === c.code
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <span className="font-medium">{c.symbol}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature highlights (left side)                                     */
/* ------------------------------------------------------------------ */
export function LeftInfoSection({ logoUrl, tenantName }: { logoUrl?: string | null, tenantName?: string }) {
  return (
    <div className="flex flex-col h-full w-full justify-between pt-10">
      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 mt-10">
        {/* Logo */}
        <a href="/" className="flex flex-col items-center justify-center group mb-5">
          {logoUrl ? (
            <img src={logoUrl} alt={tenantName || COMPANY_NAME} className="h-20 w-auto object-contain mb-4" />
          ) : (
            <CompanyLogo href={null} variant="icon" imgClassName="size-20 mb-4" />
          )}
          <h1 className="text-2xl font-bold text-foreground tracking-tight mt-2">
            {COMPANY_NAME}
          </h1>
          {tenantName && tenantName !== COMPANY_NAME && (
            <p className="text-sm text-muted-foreground">{tenantName}</p>
          )}
          <p className="mt-2 max-w-xs text-center text-sm text-muted-foreground leading-relaxed">
            Fleet, station, transport, and tank operations in one place.
          </p>
        </a>

        {/* Stars */}
        <div className="flex items-center gap-1.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-primary text-primary" />
          ))}
        </div>
        
      </div>

      {/* Bottom Logos */}
      <div className="pb-8 mt-12 w-full flex flex-col items-center justify-center text-muted-foreground">
        <PoweredBy />
      </div>
    </div>
  );
}

export function AuthLayoutWrapper({ 
  children, 
  logoUrl, 
  tenantName,
  gridClassName,
  cardContainerClassName,
}: { 
  children: React.ReactNode;
  logoUrl?: string | null;
  tenantName?: string;
  gridClassName?: string;
  cardContainerClassName?: string;
}) {
  return (
    <section className="bg-background relative min-h-screen flex flex-col">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 right-0 overflow-hidden md:block hidden">
        <div className="absolute left-1/1 top-0 h-650 w-650 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/5 dark:bg-white/10" />
        <div className="absolute left-1/1 top-0 h-175 w-175 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pt-14 pb-10 lg:px-8">
        <div className={cn("grid w-full gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-24", gridClassName)}>
          {/* Left — Info Section */}
          <div className="hidden lg:flex">
            <LeftInfoSection logoUrl={logoUrl} tenantName={tenantName} />
          </div>

          {/* Right — Form Card */}
          <div className={cn("flex items-center justify-center lg:justify-end", cardContainerClassName)}>
            <div className="flex w-full flex-col items-center lg:contents">
              <div className="lg:hidden mb-8 flex flex-col items-center text-center">
                {logoUrl ? (
                  <img src={logoUrl} alt={tenantName || COMPANY_NAME} className="h-12 w-auto object-contain" />
                ) : (
                  <CompanyLogo href={null} variant="icon" imgClassName="size-14" />
                )}
                <h1 className="mt-3 text-xl font-bold text-foreground tracking-tight">{COMPANY_NAME}</h1>
                <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                  Fleet, station, transport, and tank operations in one place.
                </p>
              </div>
              {children}
              <div className="lg:hidden mt-10 text-muted-foreground">
                <PoweredBy />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
