"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowRight, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    href: "/admin/payments/new/incoming",
    title: "Incoming Payment",
    description: "Record a payment received from a customer or station.",
    icon: ArrowDownLeft,
    tone: "text-emerald-600 bg-emerald-500/10 group-hover:bg-emerald-500/15",
  },
  {
    href: "/admin/payments/new/outgoing",
    title: "Outgoing Payment",
    description: "Record a transport fee payout or fleet expense.",
    icon: ArrowUpRight,
    tone: "text-red-600 bg-red-500/10 group-hover:bg-red-500/15",
  },
];

export function LogPaymentModal() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <Button onClick={() => setOpen(true)}>Log Payment</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log Payment</DialogTitle>
            <DialogDescription>Choose the type of payment you want to record.</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            {OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.href}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(opt.href);
                  }}
                  className="group flex w-full items-center gap-3 rounded-lg border border-border/60 p-3 text-left transition-colors hover:border-border hover:bg-muted/40"
                >
                  <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", opt.tone)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none">{opt.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug">{opt.description}</p>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
