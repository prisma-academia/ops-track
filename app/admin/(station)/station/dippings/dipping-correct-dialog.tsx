"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Droplets,
  Fuel,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { apiGet, apiPost } from "@/lib/client/api";
import { cn, formatNumberInput } from "@/lib/utils";
import type { DippingCorrectContext } from "./dippings-manager";

type PriceRow = {
  productType: string;
  pricePerLiter: number | string;
  effectiveFrom: string;
};

function fmtMoney(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseDecimalInput(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Naira totals from L × price — avoid float dust in the UI (e.g. …4999999995). */
function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function tankLevelTone(pct: number, depleted: boolean, hasValues: boolean) {
  if (!hasValues) {
    return {
      Icon: Fuel,
      iconClass: "text-muted-foreground",
      hint: "",
    };
  }
  if (depleted || pct <= 20) {
    return {
      Icon: AlertTriangle,
      iconClass: "text-red-600 dark:text-red-400",
      hint: depleted ? "Empty" : "Low volume",
    };
  }
  if (pct <= 50) {
    return {
      Icon: AlertCircle,
      iconClass: "text-amber-600 dark:text-amber-400",
      hint: "Low volume",
    };
  }
  return {
    Icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    hint: "Normal",
  };
}

export function DippingCorrectDialog({
  context,
  open,
  onOpenChange,
}: {
  context: DippingCorrectContext | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [opening, setOpening] = React.useState("");
  const [closing, setClosing] = React.useState("");
  const [fetchedPrice, setFetchedPrice] = React.useState<number | null>(null);
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [fetchingPrice, setFetchingPrice] = React.useState(false);
  const [latestPriceHint, setLatestPriceHint] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!context || !open) return;
    setOpening(String(context.openingLiters));
    setClosing(String(context.closingLiters));
    setFetchedPrice(null);
    setReason("");
    setLatestPriceHint(null);
  }, [context, open]);

  const openL = parseDecimalInput(opening);
  const closeL = parseDecimalInput(closing);
  const intervalOpen = openL ?? 0;
  const remaining = closeL ?? 0;
  const remainingPct =
    intervalOpen > 0 ? Math.max(0, Math.min(100, (remaining / intervalOpen) * 100)) : 0;
  const depleted = closeL != null && intervalOpen > 0 && remaining <= 0.009;
  const hasLevelValues = openL != null && closeL != null;
  const levelTone = tankLevelTone(remainingPct, depleted, hasLevelValues);
  const LevelStatusIcon = levelTone.Icon;

  const soldLiters =
    openL != null && closeL != null ? Math.max(0, openL - closeL) : null;

  const preview = React.useMemo(() => {
    if (openL == null || closeL == null || fetchedPrice == null || fetchedPrice <= 0) return null;
    const sold = Math.max(0, openL - closeL);
    return {
      openL,
      closeL,
      priceL: fetchedPrice,
      sold,
      revenue: roundMoney(sold * fetchedPrice),
    };
  }, [openL, closeL, fetchedPrice]);

  const salesAmount =
    soldLiters != null && fetchedPrice != null && fetchedPrice > 0
      ? roundMoney(soldLiters * fetchedPrice)
      : null;

  const handleLatestPrice = async () => {
    if (!context) return;
    setFetchingPrice(true);
    setLatestPriceHint(null);
    try {
      const res = await apiGet<PriceRow[]>(
        `/api/tenant/stations/${context.stationId}/prices`,
      );
      if (res.error || !res.data) {
        toast.error(res.error?.message ?? "Could not load station prices.");
        return;
      }
      const latest = res.data.find((row) => row.productType === context.productType);
      if (!latest) {
        toast.error(`No price history found for ${context.productType}.`);
        return;
      }
      const latestNum = Number(latest.pricePerLiter);
      setFetchedPrice(latestNum);
      setLatestPriceHint(
        `Latest ${context.productType}: ${fmtMoney(latestNum)} (effective ${new Date(latest.effectiveFrom).toLocaleString()})`,
      );
    } catch {
      toast.error("Could not load station prices.");
    } finally {
      setFetchingPrice(false);
    }
  };

  const handleSubmit = async () => {
    if (!context || !preview) return;
    if (preview.closeL > preview.openL + 0.001) {
      toast.error(
        `Litres left (${preview.closeL.toLocaleString()} L) cannot be more than opening for this period (${preview.openL.toLocaleString()} L).`,
      );
      return;
    }
    if (
      context.expectedMinOpening != null &&
      preview.openL + 0.001 < context.expectedMinOpening
    ) {
      toast.error(
        `Opening cannot be less than the last closing (${context.expectedMinOpening.toLocaleString()} L).`,
      );
      return;
    }
    if (fetchedPrice == null) {
      toast.error("Fetch the latest station price before saving.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Please enter a short reason (at least 3 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost(
        `/api/tenant/stations/${context.stationId}/dipping-sessions/${context.sessionId}/closings/${context.closingId}/correct`,
        {
          openingLiters: preview.openL,
          closingLiters: preview.closeL,
          pricePerLiter: preview.priceL,
          reason: reason.trim(),
        },
      );
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Dipping updated. Refreshing…");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Could not save this correction.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!context) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Correct dipping</DialogTitle>
          <DialogDescription>
            {context.stationName} · {context.tankName} ({context.productType}) ·{" "}
            {formatReason(context.reason)}
            {context.salesLogId ? " · Linked sale (not approved)" : " · No sales report yet"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <Label htmlFor="dip-correct-opening">Opening (L)</Label>
              <FormattedNumberInput
                id="dip-correct-opening"
                className="mt-1"
                value={opening}
                onChange={(e) => setOpening(e.target.value)}
                prefixIcon={<Droplets className="size-4 text-muted-foreground" />}
              />
            </div>
            <div>
              <Label htmlFor="dip-correct-closing">Closing (L)</Label>
              <FormattedNumberInput
                id="dip-correct-closing"
                className="mt-1"
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                prefixIcon={<Droplets className="size-4 text-muted-foreground" />}
              />
            </div>
            <div>
              <Label htmlFor="dip-correct-remaining">Tank remaining (L)</Label>
              <FormattedNumberInput
                id="dip-correct-remaining"
                className="mt-1"
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                prefixIcon={<Fuel className="size-4 text-muted-foreground" />}
                suffixIcon={
                  <LevelStatusIcon
                    className={cn("size-4", levelTone.iconClass)}
                    aria-hidden
                  />
                }
                title={levelTone.hint || undefined}
              />
              {hasLevelValues && levelTone.hint ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {levelTone.hint} · {remainingPct.toFixed(0)}% of opening
                </p>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <Label htmlFor="dip-correct-price">Price per litre</Label>
              <InputGroup className="mt-1 h-10">
                <InputGroupAddon>
                  <InputGroupText>₦</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="dip-correct-price"
                  readOnly
                  tabIndex={-1}
                  placeholder="Fetch latest price"
                  value={
                    fetchedPrice != null ? formatNumberInput(fetchedPrice) : ""
                  }
                  className="font-mono tabular-nums"
                />
                <InputGroupAddon align="inline-end" className="pr-1">
                  <InputGroupButton
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-7 gap-1.5 px-2 text-xs"
                    disabled={fetchingPrice}
                    onClick={handleLatestPrice}
                  >
                    {fetchingPrice ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CircleDollarSign className="size-3.5" />
                    )}
                    Fetch latest
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div>
              <Label htmlFor="dip-correct-sales-amount">Sales amount</Label>
              <InputGroup className="mt-1 h-10">
                <InputGroupAddon>
                  <CircleDollarSign className="size-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  id="dip-correct-sales-amount"
                  readOnly
                  tabIndex={-1}
                  placeholder="Volumes and price required"
                  value={
                    salesAmount != null
                      ? formatNumberInput(salesAmount.toFixed(2))
                      : ""
                  }
                  className="font-mono tabular-nums"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupText>₦</InputGroupText>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>
          {latestPriceHint && (
            <p className="text-xs text-muted-foreground">{latestPriceHint}</p>
          )}

          <div>
            <Label htmlFor="dip-correct-reason">Reason</Label>
            <Textarea
              id="dip-correct-reason"
              className="mt-1"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Submitted with old price after station price update"
            />
          </div>

          {context.salesLogId ? (
            <p className="text-xs text-muted-foreground">
              Linked sales report litres and price will be updated. Payments stay as recorded; a
              mismatch may flag the sale for review.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only dipping volumes and applied price are updated. No sales report is linked yet.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" disabled={submitting || !preview} onClick={handleSubmit}>
            {submitting ? "Saving…" : "Save correction"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatReason(reason: string | null) {
  const labels: Record<string, string> = {
    END_OF_DAY: "End of Day",
    PRICE_CHANGE: "Price Change",
    ROUTINE: "Routine",
  };
  if (!reason) return "Closing";
  return labels[reason] ?? reason.replaceAll("_", " ");
}