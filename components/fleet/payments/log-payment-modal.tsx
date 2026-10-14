"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Wallet01Icon,
  BankIcon,
  CreditCardIcon,
  ArrowDownLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    href: "/admin/payments/new/outgoing",
    label: "Pay",
    sublabel: "Outgoing",
    icon: ArrowUpRight01Icon,
    className:
      "bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 dark:text-rose-400 ring-rose-500/20",
  },
  {
    href: "/admin/payments/new/incoming",
    label: "Receive",
    sublabel: "Incoming",
    icon: ArrowDownLeft01Icon,
    className:
      "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-400 ring-emerald-500/20",
  },
] as const;

export function LogPaymentModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const navigate = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Log Payment</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle>Log Payment</DialogTitle>
            <DialogDescription>Record money leaving or entering the business.</DialogDescription>
          </DialogHeader>

          <div
            className="relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-b from-primary/8 via-muted/50 to-muted/30 px-6 py-10"
            aria-hidden
          >
            <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
            <div className="relative flex items-end justify-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border/50 backdrop-blur-sm">
                <HugeiconsIcon icon={BankIcon} size={22} strokeWidth={1.75} />
              </div>
              <div className="flex size-16 items-center justify-center rounded-2xl bg-background text-primary shadow-md ring-1 ring-border/60">
                <HugeiconsIcon icon={Wallet01Icon} size={32} strokeWidth={1.75} />
              </div>
              <div className="flex size-11 items-center justify-center rounded-xl bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border/50 backdrop-blur-sm">
                <HugeiconsIcon icon={CreditCardIcon} size={22} strokeWidth={1.75} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {ACTIONS.map((action) => (
              <button
                key={action.href}
                type="button"
                onClick={() => navigate(action.href)}
                className={cn(
                  "group flex w-full min-w-0 items-center gap-2 rounded-2xl px-3 py-3.5 ring-1 ring-inset transition-colors",
                  action.className,
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/70 shadow-sm ring-1 ring-border/40">
                  <HugeiconsIcon icon={action.icon} size={20} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1 text-left leading-tight">
                  <span className="block text-sm font-semibold">{action.label}</span>
                  <span className="block text-xs font-medium opacity-80">{action.sublabel}</span>
                </span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  size={18}
                  strokeWidth={2}
                  className="shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-80"
                />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
