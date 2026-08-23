"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatHumanReadableDate } from "@/lib/utils";
import { CheckCircle2, Eye, User } from "lucide-react";
import Image from "next/image";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";

interface ExpenseUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface ExpenseStation {
  id: string;
  name: string;
  code: string;
}

interface BankAccountOption {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
}

interface ExpenseRow {
  id: string;
  tenantId: string;
  stationId: string;
  category: "FUEL_FOR_GEN" | "MAINTENANCE" | "UTILITIES" | "STATIONERY" | "OTHER";
  paymentMethod: string;
  amount: number;
  description: string;
  receiptUrl: string | null;
  bankAccount: { bankName: string; accountNumber: string } | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  recordedById: string;
  approvedById: string | null;
  createdAt: string | Date;
  station: ExpenseStation;
  recordedBy: ExpenseUser | null;
  approvedBy: ExpenseUser | null;
}

const CATEGORY_MAP = {
  FUEL_FOR_GEN: "Generator Fuel",
  MAINTENANCE: "Equipment Maintenance",
  UTILITIES: "Utilities (Water, Power)",
  STATIONERY: "Stationery",
  OTHER: "Other Expenses",
};

const PAYMENT_METHOD_MAP: Record<string, string> = {
  CASH: "Cash",
  POS: "POS Machine",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
};

export function ExpensesManager({
  initialExpenses,
  initialMeta,
  stations,
  bankAccounts: _bankAccounts,
}: {
  initialExpenses: ExpenseRow[];
  initialMeta: any;
  stations: { id: string; name: string; code: string }[];
  bankAccounts: BankAccountOption[];
}) {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const searchParams = useSearchParams();

  const appliedFilters: Record<string, string> = {};
  if (searchParams.has("stationId")) appliedFilters.stationId = searchParams.get("stationId")!;
  if (searchParams.has("category")) appliedFilters.category = searchParams.get("category")!;
  if (searchParams.has("paymentMethod")) appliedFilters.paymentMethod = searchParams.get("paymentMethod")!;
  if (searchParams.has("amountMin")) appliedFilters.amountMin = searchParams.get("amountMin")!;
  if (searchParams.has("amountMax")) appliedFilters.amountMax = searchParams.get("amountMax")!;
  if (searchParams.has("dateStart")) appliedFilters.dateStart = searchParams.get("dateStart")!;
  if (searchParams.has("dateEnd")) appliedFilters.dateEnd = searchParams.get("dateEnd")!;

  const { data: expenses, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<ExpenseRow>({
    baseUrl: "/api/tenant/expenses",
    syncWithUrl: true,
    additionalParams: appliedFilters,
  });

  useEffect(() => {
    setInitialData(initialExpenses, initialMeta);
  }, [initialExpenses, initialMeta, setInitialData]);

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedExpense(null);
  };

  const activeExpenses = expenses.length > 0 ? expenses : initialExpenses;

  const currentSelectedExpense = selectedExpense
    ? activeExpenses.find((e) => e.id === selectedExpense.id) || selectedExpense
    : null;

  const columns: ColumnDef<ExpenseRow>[] = [
    {
      id: "station_name",
      accessorFn: (row) => row.station?.name,
      header: "Station",
      cell: ({ row }) => {
        const station = row.original.station;
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="size-10 flex items-center justify-center shrink-0 text-primary">
              <Image
                src="/assets/icons/gps.png"
                alt="Station Icon"
                width={500}
                height={300}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground">{station?.name}</span>
              <span className="text-xs text-muted-foreground">
                {formatHumanReadableDate(row.original.createdAt)}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => (
        <span>{formatHumanReadableDate(row.original.createdAt)}</span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const cat = row.original.category;
        return (
          <Badge variant="secondary">
            {CATEGORY_MAP[cat as keyof typeof CATEGORY_MAP] || cat}
          </Badge>
        );
      },
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      cell: ({ row }) => {
        const method = row.original.paymentMethod;
        const bankAccount = row.original.bankAccount;
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant="outline">
              {PAYMENT_METHOD_MAP[method as keyof typeof PAYMENT_METHOD_MAP] || method}
            </Badge>
            {bankAccount && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {bankAccount.bankName} - {bankAccount.accountNumber}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const amount = Number(row.original.amount);
        return (
          <div className="text-right font-bold text-foreground font-mono">
            {amount.toLocaleString()}
          </div>
        );
      },
    },
    {
      id: "lifecycle",
      header: "Recorded & Approved By",
      cell: ({ row }) => {
        const exp = row.original;
        const recordedUser = exp.recordedBy;
        const approvedUser = exp.approvedBy;

        return (
          <div className="flex flex-col gap-2.5 py-1">
            <div className="flex items-center gap-1 text-xs text-stone-700">
              <User className="size-3 text-sky-500" />
              <span className="font-medium">
                {recordedUser
                  ? `${recordedUser.firstName ?? ""} ${recordedUser.lastName ?? ""}`.trim()
                  : "—"}
              </span>
            </div>

            <div className="flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="size-3" />
              <span className="font-semibold">
                {approvedUser
                  ? `${approvedUser.firstName ?? ""} ${approvedUser.lastName ?? ""}`.trim()
                  : "Approved"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Action</div>,
      cell: ({ row }) => {
        const exp = row.original;
        return (
          <div className="flex items-center gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedExpense(exp);
                setActiveDialog("details");
              }}
              className="flex items-center gap-1 h-8 px-3 rounded-4xl"
            >
              <Eye className="size-3.5" /> Details
            </Button>
          </div>
        );
      },
    },
  ];


  return (
    <div className="space-y-6">
      <DataTable
        columns={columns}
        data={activeExpenses}
        isLoading={isLoading}
        serverPagination={{
          ...meta,
          onPageChange: setPage,
          onPageSizeChange: setPageSize,
        }}
        title="Station Expenses"
        description="Approved station payouts. Create and review spend from Tickets."
        filterColumnId="station_name"
        searchPlaceholder="Search by station name…"
        filterNode={
          <DataTableFilterDrawer
            filters={[
              {
                type: "combobox",
                paramName: "stationId",
                label: "Station",
                options: stations.map(s => ({ value: s.id, label: s.name })),
              },
              {
                type: "select",
                paramName: "category",
                label: "Category",
                options: Object.entries(CATEGORY_MAP).map(([value, label]) => ({ value, label })),
              },
              {
                type: "select",
                paramName: "paymentMethod",
                label: "Payment Method",
                options: Object.entries(PAYMENT_METHOD_MAP).map(([value, label]) => ({ value, label })),
              },
              {
                type: "number-range",
                label: "Amount Range (₦)",
                fromParam: "amountMin",
                toParam: "amountMax",
              },
              {
                type: "date-range",
                label: "Date Range",
                fromParam: "dateStart",
                toParam: "dateEnd",
              },
            ]}
          />
        }
      />

      {/* ==========================================
          EXPENSE DETAILS DIALOG
      ========================================== */}
      {activeDialog === "details" && currentSelectedExpense && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="text-lg font-bold">Expense Record Details</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-5 overflow-y-auto pr-2 pb-2">
              {/* Grid of Key Info */}
              <div className="grid grid-cols-2 gap-3 bg-muted/20 p-3 rounded-2xl border border-border/40">
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Station</span>
                  <span className="font-semibold text-foreground">{currentSelectedExpense.station?.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono block">({currentSelectedExpense.station?.code})</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Amount</span>
                  <span className="font-bold text-foreground text-base font-mono">
                    {Number(currentSelectedExpense.amount).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Category</span>
                  <Badge variant="secondary" className="mt-1">
                    {CATEGORY_MAP[currentSelectedExpense.category as keyof typeof CATEGORY_MAP] || currentSelectedExpense.category}
                  </Badge>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block font-medium">Payment Method</span>
                  <Badge variant="outline" className="mt-1">
                    {PAYMENT_METHOD_MAP[currentSelectedExpense.paymentMethod as keyof typeof PAYMENT_METHOD_MAP] || currentSelectedExpense.paymentMethod}
                  </Badge>
                </div>
              </div>

              {/* Description Details */}
              <div className="space-y-1.5">
                <span className="text-xs text-muted-foreground block font-medium">Description Details</span>
                <p className="text-sm bg-background p-3 rounded-xl border border-border/30 whitespace-pre-wrap text-foreground">
                  {currentSelectedExpense.description}
                </p>
              </div>

              {/* Receipt Image if exists */}
              {currentSelectedExpense.receiptUrl && (
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground block font-medium">Receipt Document</span>
                  <div className="border border-border/40 rounded-xl overflow-hidden p-3 bg-muted/10 flex items-center justify-between">
                    <span className="text-xs truncate max-w-xs">{currentSelectedExpense.receiptUrl}</span>
                    <a
                      href={currentSelectedExpense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-semibold"
                    >
                      View Receipt
                    </a>
                  </div>
                </div>
              )}

              {/* Timeline of Created & Approved */}
              <div className="space-y-2">
                <span className="text-xs text-muted-foreground block font-medium">Transaction Timeline</span>
                <div className="relative pl-6 space-y-4 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                  {/* Created By Node */}
                  <div className="relative">
                    <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-primary border-2 border-background" />
                    <div>
                      <span className="text-sm font-semibold block">Expense Recorded</span>
                      <span className="text-xs text-muted-foreground block">
                        By{" "}
                        <strong>
                          {currentSelectedExpense.recordedBy
                            ? `${currentSelectedExpense.recordedBy.firstName ?? ""} ${currentSelectedExpense.recordedBy.lastName ?? ""}`.trim()
                            : "Unknown"}
                        </strong>{" "}
                        ({currentSelectedExpense.recordedBy?.email || "No email"})
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatHumanReadableDate(currentSelectedExpense.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Status Node */}
                  <div className="relative">
                    {currentSelectedExpense.status === "APPROVED" ? (
                      <>
                        <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-emerald-600 border-2 border-background" />
                        <div>
                          <span className="text-sm font-semibold text-emerald-600 block">
                            Approved
                          </span>
                          <span className="text-xs text-muted-foreground block">
                            By{" "}
                            <strong>
                              {currentSelectedExpense.approvedBy
                                ? `${currentSelectedExpense.approvedBy.firstName ?? ""} ${currentSelectedExpense.approvedBy.lastName ?? ""}`.trim()
                                : "Administrator"}
                            </strong>{" "}
                            ({currentSelectedExpense.approvedBy?.email || "No email"})
                          </span>
                        </div>
                      </>
                    ) : currentSelectedExpense.status === "REJECTED" ? (
                      <>
                        <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-red-600 border-2 border-background" />
                        <div>
                          <span className="text-sm font-semibold text-red-600 block">Rejected</span>
                          <span className="text-xs text-muted-foreground block">
                            By{" "}
                            <strong>
                              {currentSelectedExpense.approvedBy
                                ? `${currentSelectedExpense.approvedBy.firstName ?? ""} ${currentSelectedExpense.approvedBy.lastName ?? ""}`.trim()
                                : "Administrator"}
                            </strong>{" "}
                            ({currentSelectedExpense.approvedBy?.email || "No email"})
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute -left-[20px] top-1 size-3 rounded-full bg-amber-500 border-2 border-background" />
                        <div>
                          <span className="text-sm font-semibold text-amber-500 block">Pending Approval</span>
                          <span className="text-xs text-muted-foreground block">
                            Awaiting verification and sign-off by a manager or supervisor.
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-row items-center sm:justify-end gap-2 shrink-0 pt-2 border-t">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

