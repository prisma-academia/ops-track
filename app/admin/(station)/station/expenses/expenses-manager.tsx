"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { Check, CheckCircle2, ChevronsUpDown, Eye, Loader2, Plus, User } from "lucide-react";
import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { FilePreviewButton } from "@/components/file-viewer-modal";
import { apiPost } from "@/lib/client/api";
import { toast } from "sonner";

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
  ticket?: { id: string; title: string; status: string; category: string } | null;
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
  bankAccounts,
}: {
  initialExpenses: ExpenseRow[];
  initialMeta: any;
  stations: { id: string; name: string; code: string }[];
  bankAccounts: BankAccountOption[];
}) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<"details" | "create" | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [approvingExpenseId, setApprovingExpenseId] = useState<string | null>(null);

  // Create Expense Form State
  const [createStationId, setCreateStationId] = useState(stations[0]?.id || "");
  const [createCategory, setCreateCategory] = useState<string>("FUEL_FOR_GEN");
  const [createPaymentMethod, setCreatePaymentMethod] = useState<string>("CASH");
  const [createBankAccountId, setCreateBankAccountId] = useState<string>("");
  const [createAmount, setCreateAmount] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [openStationSelect, setOpenStationSelect] = useState(false);
  const [openBankSelect, setOpenBankSelect] = useState(false);

  const selectedStation = stations.find((s) => s.id === createStationId);
  const selectedBank = bankAccounts.find((b) => b.id === createBankAccountId);

  const searchParams = useSearchParams();

  const appliedFilters: Record<string, string> = {};
  if (searchParams.has("stationId")) appliedFilters.stationId = searchParams.get("stationId")!;
  if (searchParams.has("category")) appliedFilters.category = searchParams.get("category")!;
  if (searchParams.has("paymentMethod")) appliedFilters.paymentMethod = searchParams.get("paymentMethod")!;
  if (searchParams.has("status")) appliedFilters.status = searchParams.get("status")!;
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
    setCreateError(null);
    setCreateAmount("");
    setCreateDescription("");
    setOpenStationSelect(false);
    setOpenBankSelect(false);
  };

  const activeExpenses = expenses.length > 0 ? expenses : initialExpenses;

  const currentSelectedExpense = selectedExpense
    ? activeExpenses.find((e) => e.id === selectedExpense.id) || selectedExpense
    : null;

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createStationId) {
      setCreateError("Please select a station");
      return;
    }

    const amt = parseFloat(createAmount.replace(/,/g, ""));
    if (isNaN(amt) || amt <= 0) {
      setCreateError("Amount must be greater than 0");
      return;
    }

    if (!createDescription.trim()) {
      setCreateError("Please provide a description");
      return;
    }

    if (createPaymentMethod !== "CASH" && !createBankAccountId) {
      setCreateError("Bank account is required for non-cash payment methods");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiPost<{ expense: ExpenseRow }>("/api/tenant/expenses", {
        stationId: createStationId,
        category: createCategory,
        paymentMethod: createPaymentMethod,
        amount: amt,
        description: createDescription.trim(),
        bankAccountId: createPaymentMethod === "CASH" ? null : createBankAccountId,
      });

      if (res.error) {
        setCreateError(res.error.message || "Failed to record expense");
        return;
      }

      toast.success("Expense recorded successfully");
      closeDialog();
      setCreateAmount("");
      setCreateDescription("");
      router.refresh();
    } catch {
      setCreateError("An unexpected error occurred while saving the expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveExpense = async (expenseId: string, status: "APPROVED" | "REJECTED") => {
    setApprovingExpenseId(expenseId);
    try {
      const res = await apiPost<{ expense: ExpenseRow }>(`/api/tenant/expenses/${expenseId}/approve`, {
        status,
      });

      if (res.error) {
        toast.error(res.error.message || `Failed to ${status.toLowerCase()} expense`);
        return;
      }

      toast.success(`Expense ${status.toLowerCase()} successfully`);
      closeDialog();
      router.refresh();
    } catch {
      toast.error(`Failed to ${status.toLowerCase()} expense`);
    } finally {
      setApprovingExpenseId(null);
    }
  };

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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status;
        switch (status) {
          case "APPROVED":
            return (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 font-semibold">
                Approved
              </Badge>
            );
          case "REJECTED":
            return (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800 font-semibold">
                Rejected
              </Badge>
            );
          case "PENDING":
          default:
            return (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 font-semibold">
                Pending
              </Badge>
            );
        }
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
                  : exp.status === "PENDING"
                    ? "Pending Sign-off"
                    : "—"}
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
        description="Track and manage station operational expenses and disbursements."
        filterColumnId="station_name"
        searchPlaceholder="Search by station name…"
        headerAction={
          <Button onClick={() => setActiveDialog("create")} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Expense
          </Button>
        }
        filterNode={
          <DataTableFilterDrawer
            filters={[
              {
                type: "combobox",
                paramName: "stationId",
                label: "Station",
                options: stations.map((s) => ({ value: s.id, label: s.name })),
              },
              {
                type: "select",
                paramName: "status",
                label: "Status",
                options: [
                  { value: "ALL", label: "All Statuses" },
                  { value: "PENDING", label: "Pending" },
                  { value: "APPROVED", label: "Approved" },
                  { value: "REJECTED", label: "Rejected" },
                ],
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
          CREATE EXPENSE DIALOG
      ========================================== */}
      {activeDialog === "create" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Record Station Expense</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
              {/* Station Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="stationId">Station *</Label>
                <Popover open={openStationSelect} onOpenChange={setOpenStationSelect}>
                  <PopoverTrigger asChild>
                    <Button
                      id="stationId"
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={openStationSelect}
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate">
                        {selectedStation
                          ? `${selectedStation.name} (${selectedStation.code})`
                          : "Select station..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="p-0"
                    style={{ width: "var(--radix-popover-trigger-width)" }}
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Search station by name or code..." />
                      <CommandList>
                        <CommandEmpty>No station found.</CommandEmpty>
                        <CommandGroup>
                          {stations.map((s) => (
                            <CommandItem
                              key={s.id}
                              value={`${s.name} ${s.code}`}
                              onSelect={() => {
                                setCreateStationId(s.id);
                                setOpenStationSelect(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  createStationId === s.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="font-medium">{s.name}</span>
                              <span className="text-xs text-muted-foreground ml-1.5">({s.code})</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Category & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={createCategory} onValueChange={setCreateCategory}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {Object.entries(CATEGORY_MAP).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
                  <Select
                    value={createPaymentMethod}
                    onValueChange={(val) => {
                      setCreatePaymentMethod(val);
                      if (val === "CASH") setCreateBankAccountId("");
                    }}
                  >
                    <SelectTrigger id="paymentMethod" className="w-full">
                      <SelectValue placeholder="Payment Method" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      {Object.entries(PAYMENT_METHOD_MAP).map(([val, label]) => (
                        <SelectItem key={val} value={val}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bank Account for Non-Cash */}
              {createPaymentMethod !== "CASH" && (
                <div className="space-y-1.5">
                  <Label htmlFor="bankAccountId">Station Bank Account *</Label>
                  <Popover open={openBankSelect} onOpenChange={setOpenBankSelect}>
                    <PopoverTrigger asChild>
                      <Button
                        id="bankAccountId"
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={openBankSelect}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {selectedBank
                            ? `${selectedBank.bankName} - ${selectedBank.accountNumber} (${selectedBank.accountName})`
                            : "Select bank account..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="p-0"
                      style={{ width: "var(--radix-popover-trigger-width)" }}
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Search bank, account number or name..." />
                        <CommandList>
                          <CommandEmpty>No bank account found.</CommandEmpty>
                          <CommandGroup>
                            {bankAccounts.length === 0 ? (
                              <div className="p-3 text-xs text-muted-foreground text-center">
                                No bank accounts configured
                              </div>
                            ) : (
                              bankAccounts.map((b) => (
                                <CommandItem
                                  key={b.id}
                                  value={`${b.bankName} ${b.accountNumber} ${b.accountName}`}
                                  onSelect={() => {
                                    setCreateBankAccountId(b.id);
                                    setOpenBankSelect(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4 shrink-0",
                                      createBankAccountId === b.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col text-left">
                                    <span className="font-medium text-sm">{b.bankName}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {b.accountNumber} • {b.accountName}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (₦) *</Label>
                <FormattedNumberInput
                  id="amount"
                  placeholder="0.00"
                  value={createAmount}
                  onChange={(e) => setCreateAmount(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Description / Purpose *</Label>
                <Textarea
                  id="description"
                  placeholder="Details of the expense..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              {createError && (
                <p className="text-xs text-destructive bg-destructive/10 p-2.5 rounded-lg">
                  {createError}
                </p>
              )}

              <DialogFooter className="pt-2 gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    "Record Expense"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

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
                    ₦{Number(currentSelectedExpense.amount).toLocaleString()}
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
                  <div className="border border-border/40 rounded-xl overflow-hidden p-3 bg-muted/10 flex items-center justify-between gap-3">
                    <span className="text-xs truncate max-w-xs text-muted-foreground">{currentSelectedExpense.receiptUrl}</span>
                    <FilePreviewButton
                      fileUrl={currentSelectedExpense.receiptUrl}
                      fileName={`Expense Receipt - ${currentSelectedExpense.category || "Expense"}`}
                      label="Preview Receipt"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs font-medium shrink-0"
                    />
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
              {currentSelectedExpense.status === "PENDING" && (
                <div className="flex items-center gap-2 mr-auto">
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => handleApproveExpense(currentSelectedExpense.id, "REJECTED")}
                    disabled={approvingExpenseId === currentSelectedExpense.id}
                  >
                    {approvingExpenseId === currentSelectedExpense.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Reject"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApproveExpense(currentSelectedExpense.id, "APPROVED")}
                    disabled={approvingExpenseId === currentSelectedExpense.id}
                  >
                    {approvingExpenseId === currentSelectedExpense.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Approve"
                    )}
                  </Button>
                </div>
              )}
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
