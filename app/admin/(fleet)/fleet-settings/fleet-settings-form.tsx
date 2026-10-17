"use client";

import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AccidentIcon,
  AlertDiamondIcon,
  ChartLineData01Icon,
  DropletIcon,
  DropletsIcon,
  HelpCircleIcon,
  MoreHorizontalIcon,
  PackageOutOfStockIcon,
  SecurityCheckIcon,
  Shield01Icon,
  Store01Icon,
  TruckIcon,
  WarehouseIcon,
} from "@hugeicons/core-free-icons";
import { apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLossTypeLabel, PRODUCT_LOSS_TYPES, type ProductLossType } from "@/lib/fleet/loss-types";
import type { FleetSettings } from "@/lib/fleet/fleet-settings";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const SHORTAGE_BASIS_LABELS: Record<FleetSettings["shortageDeductionBasis"], string> = {
  LANDED_COST: "Landed cost",
  TRANSPORT_RATE: "Transport rate",
  SELLING_PRICE: "Selling price",
};

function describeFleetSettingChanges(before: FleetSettings, after: FleetSettings): string[] {
  const lines: string[] = [];
  if (before.useAttributionPnL !== after.useAttributionPnL) {
    lines.push(
      `Attribution P&L: ${after.useAttributionPnL ? "ON" : "OFF"} — ${
        after.useAttributionPnL
          ? "fleet P&L reports will use sold-litre margin and company-only incident loss"
          : "reports revert to legacy full-order economics"
      }.`
    );
  }
  if (before.requireSupplierTypeForOrders !== after.requireSupplierTypeForOrders) {
    lines.push(
      `Require supplier type: ${after.requireSupplierTypeForOrders ? "ON" : "OFF"} — ${
        after.requireSupplierTypeForOrders
          ? "new orders will be blocked for suppliers without Local or Depot type"
          : "orders may be created for untyped suppliers again"
      }.`
    );
  }
  if (before.shortageDeductionBasis !== after.shortageDeductionBasis) {
    lines.push(
      `Depot shortage deduction basis: ${SHORTAGE_BASIS_LABELS[after.shortageDeductionBasis]} — affects transporter fee deductions on open trips when recomputed.`
    );
  }
  const beforeLoss = new Set(before.companyLossTypes);
  const afterLoss = new Set(after.companyLossTypes);
  for (const type of PRODUCT_LOSS_TYPES.map((t) => t.value)) {
    const was = beforeLoss.has(type);
    const now = afterLoss.has(type);
    if (was === now) continue;
    lines.push(
      `Company loss — ${getLossTypeLabel(type)}: ${now ? "will reduce company P&L" : "will no longer reduce company P&L"} (when Attribution P&L is on).`
    );
  }
  return lines;
}

function HelpTip({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="More information"
        >
          <HugeiconsIcon icon={HelpCircleIcon} size={14} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-xs text-left leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function SectionCard({
  icon,
  title,
  hint,
  children,
}: {
  icon: typeof ChartLineData01Icon;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <HugeiconsIcon icon={icon} size={16} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="divide-y">{children}</div>
    </section>
  );
}

function SettingRow({
  icon,
  title,
  tip,
  children,
  className,
}: {
  icon?: typeof ChartLineData01Icon;
  title: string;
  tip: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", className)}>
      {icon ? (
        <span className="hidden size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground sm:flex">
          <HugeiconsIcon icon={icon} size={15} />
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <p className="truncate text-sm font-medium">{title}</p>
        <HelpTip>{tip}</HelpTip>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function PolicyNote({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-3 text-xs leading-relaxed text-muted-foreground border-b last:border-b-0">
      {children}
    </p>
  );
}

const LOSS_ICONS: Record<ProductLossType, typeof AccidentIcon> = {
  THEFT: SecurityCheckIcon,
  ACCIDENT: AccidentIcon,
  SPILL: DropletIcon,
  LEAKAGE: DropletsIcon,
  SHORTAGE: PackageOutOfStockIcon,
  CONTAMINATION: AlertDiamondIcon,
  OTHERS: MoreHorizontalIcon,
};

export function FleetSettingsForm({ initialFleet }: { initialFleet: FleetSettings }) {
  const [fleet, setFleet] = useState(initialFleet);
  const [savedBaseline, setSavedBaseline] = useState(initialFleet);
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const pendingChanges = useMemo(
    () => describeFleetSettingChanges(savedBaseline, fleet),
    [savedBaseline, fleet]
  );

  const toggleLossType = (value: string) => {
    setFleet((prev) => {
      const has = prev.companyLossTypes.includes(value as FleetSettings["companyLossTypes"][number]);
      const companyLossTypes = has
        ? prev.companyLossTypes.filter((t) => t !== value)
        : [...prev.companyLossTypes, value as FleetSettings["companyLossTypes"][number]];
      return { ...prev, companyLossTypes };
    });
  };

  const onSave = async () => {
    setPending(true);
    const res = await apiPatch("/api/tenant/settings", { settings: { fleet } });
    setPending(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    setSavedBaseline(fleet);
    setConfirmOpen(false);
    toast.success("Fleet accounting settings saved.");
  };

  const requestSave = () => {
    if (pendingChanges.length === 0) {
      toast.message("No changes to save.");
      return;
    }
    setConfirmOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
        <AlertTriangle className="size-5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden />
        <div className="space-y-1 text-muted-foreground">
          <p className="font-medium text-foreground">Owner-only — system-wide fleet rules</p>
          <p className="text-xs leading-relaxed">
            These settings control supplier payables (Local), transporter fee deductions (Depot), fleet P&L
            reports, and which loss logs hit company margin. Saving requires confirmation. Completed trips are
            not mass-recomputed; open transports reconcile on delivery events.
          </p>
        </div>
      </div>
      <SectionCard
        icon={ChartLineData01Icon}
        title="Profit & loss"
        hint="Sold-litre margin vs legacy full-order economics"
      >
        <PolicyNote>
          <span className="font-medium text-foreground">Attribution P&L</span> aligns company margin with{" "}
          <span className="font-medium text-foreground">litres actually sold</span> at landed cost. Recoverable
          transporter shortages are not double-counted as company expense. Turn this on when using Local and Depot
          supplier rules below — especially Depot trips where admin balance should match product already sold.
        </PolicyNote>
        <SettingRow
          title="Attribution P&L"
          tip="On: margin uses litres sold at cost; recoverable transporter shortage is excluded. Off: legacy full-order economics."
        >
          <div className="flex items-center gap-2">
            <Badge
              variant={fleet.useAttributionPnL ? "default" : "outline"}
              className="h-5 px-1.5 text-[10px] font-medium"
            >
              {fleet.useAttributionPnL ? "Active" : "Legacy"}
            </Badge>
            <Switch
              checked={fleet.useAttributionPnL}
              onCheckedChange={(checked) =>
                setFleet((prev) => ({ ...prev, useAttributionPnL: checked }))
              }
            />
          </div>
        </SettingRow>
      </SectionCard>

      <SectionCard
        icon={Store01Icon}
        title="Local supplier"
        hint="Shortage on supplier; pay landed cost for billable litres only"
      >
        <PolicyNote>
          Suppliers marked <span className="font-medium text-foreground">Local</span> attribute delivery shortages to
          the supplier. Billable volume is{" "}
          <span className="font-medium text-foreground">litres ordered minus credited shortage</span>; supplier
          payments and balances use that amount at landed cost (product + loading).
        </PolicyNote>
        <PolicyNote>
          Shortage party is determined by supplier type: Local → supplier, Depot → transporter (not a separate default).
        </PolicyNote>
        <SettingRow
          title="Require supplier type"
          tip="Blocks creating orders unless the supplier is Local or Depot. Turn on after existing suppliers are classified."
        >
          <Switch
            checked={fleet.requireSupplierTypeForOrders}
            onCheckedChange={(checked) =>
              setFleet((prev) => ({ ...prev, requireSupplierTypeForOrders: checked }))
            }
          />
        </SettingRow>
      </SectionCard>

      <SectionCard
        icon={WarehouseIcon}
        title="Depot supplier"
        hint="Shortage on transporter; deducted from haulage fee"
      >
        <PolicyNote>
          Suppliers marked <span className="font-medium text-foreground">Depot</span> charge delivery shortages to the
          transporter. The shortage amount is deducted from the trip transport fee (
          <span className="font-medium text-foreground">net fee paid</span>). If deductions exceed the fee, recover the
          balance outside the fee payment (e.g. transporter owes the company or a separate settlement).
        </PolicyNote>
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Label className="text-sm font-medium">Shortage deduction basis</Label>
            <HelpTip>
              Rate used when converting transporter shortage litres to money: landed cost, haulage rate, or selling
              price.
            </HelpTip>
          </div>
          <Select
            value={fleet.shortageDeductionBasis}
            onValueChange={(v) =>
              setFleet((prev) => ({
                ...prev,
                shortageDeductionBasis: v as FleetSettings["shortageDeductionBasis"],
              }))
            }
          >
            <SelectTrigger className="h-8 w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="LANDED_COST">Landed cost</SelectItem>
              <SelectItem value="TRANSPORT_RATE">Transport rate</SelectItem>
              <SelectItem value="SELLING_PRICE">Selling price</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      <SectionCard
        icon={TruckIcon}
        title="Company-absorbed loss logs"
        hint="Incident types that reduce company P&L when Attribution P&L is on"
      >
        <PolicyNote>
          Checked types reduce company P&L in attribution mode. Unchecked types remain on the loss log for audit only.
          Delivery <span className="font-medium text-foreground">shortage</span> is never company loss — it flows to
          supplier (Local) or transporter (Depot). New workspaces default to{" "}
          <span className="font-medium text-foreground">Accident</span> only.
        </PolicyNote>
        <div className="grid sm:grid-cols-2 sm:[&>*:nth-child(odd)]:border-r">
          {PRODUCT_LOSS_TYPES.map((type, index) => {
            const selected = fleet.companyLossTypes.includes(type.value);
            const isLast = index === PRODUCT_LOSS_TYPES.length - 1;
            const isLastDesktopRow =
              index >= PRODUCT_LOSS_TYPES.length - 1 - ((PRODUCT_LOSS_TYPES.length + 1) % 2);
            return (
              <SettingRow
                key={type.value}
                icon={LOSS_ICONS[type.value]}
                title={type.label}
                tip={type.summary}
                className={cn(
                  "border-b",
                  isLast && "border-b-0",
                  isLastDesktopRow && "sm:border-b-0"
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => toggleLossType(type.value)}
                  aria-label={`Absorb ${type.label} as company loss`}
                />
              </SettingRow>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] text-muted-foreground">
          <HugeiconsIcon icon={Shield01Icon} size={12} />
          Unchecked types stay on loss logs but do not hit company P&L under attribution.
        </p>
      </SectionCard>

      <div className="flex justify-end">
        <Button onClick={requestSave} disabled={pending}>
          Save fleet accounting
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Save fleet accounting settings?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left text-sm text-muted-foreground">
                <p>
                  You are about to change workspace-wide rules. This affects how shortages, supplier payments,
                  transporter fees, and company loss are calculated going forward.
                </p>
                <ul className="list-disc space-y-1.5 pl-4">
                  {pendingChanges.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="text-xs text-amber-700 dark:text-amber-500">
                  Existing completed transports and posted payments are not automatically recalculated. Review
                  open trips and supplier balances after saving.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                void onSave();
              }}
            >
              {pending ? "Saving…" : "Yes, save changes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
