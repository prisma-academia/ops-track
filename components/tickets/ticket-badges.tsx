"use client";

import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CircleDot,
  Clock,
  Droplets,
  HandCoins,
  Lock,
  Receipt,
  Wrench,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORY_LABELS: Record<string, string> = {
  INVENTORY_VARIANCE: "Inventory variance",
  EQUIPMENT_FAULT: "Equipment fault",
  CASH_DISCREPANCY: "Cash discrepancy",
  EXPENSE_REQUEST: "Spend request",
  EXPENSE_VERIFY: "Expense verify",
  INCIDENT_REPORT: "Incident report",
  OTHER: "Other",
};

export const STATUS_LABELS: Record<string, string> = {
  OPEN: "Open",
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  INVENTORY_VARIANCE: Droplets,
  EQUIPMENT_FAULT: Wrench,
  CASH_DISCREPANCY: AlertTriangle,
  EXPENSE_REQUEST: HandCoins,
  EXPENSE_VERIFY: Receipt,
  INCIDENT_REPORT: AlertCircle,
  OTHER: CircleDot,
};

const STATUS_ICONS: Record<string, LucideIcon> = {
  OPEN: AlertCircle,
  PENDING_APPROVAL: Clock,
  APPROVED: BadgeCheck,
  REJECTED: XCircle,
  RESOLVED: BadgeCheck,
  CLOSED: Lock,
};

const CATEGORY_TONES: Record<string, string> = {
  INVENTORY_VARIANCE: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400",
  EQUIPMENT_FAULT: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400",
  CASH_DISCREPANCY: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
  EXPENSE_REQUEST: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  EXPENSE_VERIFY: "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-400",
  INCIDENT_REPORT: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  OTHER: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
};

const STATUS_TONES: Record<string, string> = {
  OPEN: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  PENDING_APPROVAL: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
  APPROVED: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400",
  RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400",
  CLOSED: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-300",
};

function SquaredBadge({
  icon: Icon,
  label,
  tone,
  className,
}: {
  icon: LucideIcon;
  label: string;
  tone: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

export function TicketTypeBadge({ category, className }: { category: string; className?: string }) {
  return (
    <SquaredBadge
      icon={CATEGORY_ICONS[category] ?? CircleDot}
      label={CATEGORY_LABELS[category] || category.replaceAll("_", " ")}
      tone={CATEGORY_TONES[category] || CATEGORY_TONES.OTHER}
      className={className}
    />
  );
}

export function TicketStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <SquaredBadge
      icon={STATUS_ICONS[status] ?? CircleDot}
      label={STATUS_LABELS[status] || status.replaceAll("_", " ")}
      tone={STATUS_TONES[status] || STATUS_TONES.OPEN}
      className={className}
    />
  );
}
