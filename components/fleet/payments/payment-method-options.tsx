"use client";

import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BadgeCheck,
  Banknote,
  CircleCheck,
  CreditCard,
  PieChart,
  ScrollText,
  Wallet,
} from "lucide-react";
import { SelectItem } from "@/components/ui/select";

export const fieldIconClass = "size-4 shrink-0 text-muted-foreground";

type FieldOption = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export const PAYMENT_METHOD_OPTIONS: FieldOption[] = [
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: ArrowLeftRight },
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "POS", label: "POS", icon: CreditCard },
  { value: "CHEQUE", label: "Cheque", icon: ScrollText },
  { value: "DEPOSIT", label: "Apply Deposit", icon: Wallet },
];

/** Fleet log-outgoing payment (no cash or supplier deposit). */
export const OUTGOING_PAYMENT_METHOD_OPTIONS = PAYMENT_METHOD_OPTIONS.filter(
  (o) => o.value !== "CASH" && o.value !== "DEPOSIT",
);

/** Supplier outgoing payment (deposit allowed; no cash). */
export const SUPPLIER_OUTGOING_PAYMENT_METHOD_OPTIONS = PAYMENT_METHOD_OPTIONS.filter(
  (o) => o.value !== "CASH",
);

export const PAYMENT_TYPE_OPTIONS: FieldOption[] = [
  { value: "ADVANCE_DEPOSIT", label: "Advance Deposit", icon: Wallet },
  { value: "PART_PAYMENT", label: "Part Payment", icon: PieChart },
  { value: "FULL_SETTLEMENT", label: "Full Settlement", icon: CircleCheck },
  { value: "DEBT_CLEARANCE", label: "Debt Clearance", icon: BadgeCheck },
];

export function FieldIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className={fieldIconClass} aria-hidden />;
}

export function IconSelectItems({ options }: { options: FieldOption[] }) {
  return options.map((option) => {
    const Icon = option.icon;
    return (
      <SelectItem key={option.value} value={option.value}>
        <Icon className={fieldIconClass} />
        {option.label}
      </SelectItem>
    );
  });
}
