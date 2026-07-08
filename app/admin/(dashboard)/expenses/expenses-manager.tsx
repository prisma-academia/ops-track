"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { cn, formatHumanReadableDate } from "@/lib/utils";
import { Plus, CheckCircle2, AlertCircle, Eye, Check, User, ChevronsUpDown } from "lucide-react";
import Image from "next/image";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
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

interface ExpenseRow {
  id: string;
  tenantId: string;
  stationId: string;
  category: "FUEL_FOR_GEN" | "MAINTENANCE" | "UTILITIES" | "STATIONERY" | "OTHER";
  paymentMethod: "CASH" | "POS";
  amount: number;
  description: string;
  receiptUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  recordedById: string;
  approvedById: string | null;
  createdAt: string | Date;
  station: ExpenseStation;
  recordedBy: ExpenseUser | null;
  approvedBy: ExpenseUser | null;
}

const RecordExpenseSchema = z.object({
  stationId: z.string().min(1, "Station is required"),
  category: z.enum(["FUEL_FOR_GEN", "MAINTENANCE", "UTILITIES", "STATIONERY", "OTHER"]),
  paymentMethod: z.enum(["CASH", "POS"]),
  amount: z.coerce.number().positive("Amount must be a positive number"),
  description: z.string().min(2, "Description must be at least 2 characters").max(500),
  receiptUrl: z.string().optional().or(z.literal("")),
});

const CATEGORY_MAP = {
  FUEL_FOR_GEN: "Generator Fuel",
  MAINTENANCE: "Equipment Maintenance",
  UTILITIES: "Utilities (Water, Power)",
  STATIONERY: "Stationery",
  OTHER: "Other Expenses",
};

const PAYMENT_METHOD_MAP = {
  CASH: "Cash",
  POS: "POS Machine",
};

export function ExpensesManager({
  initialExpenses,
  initialMeta,
  stations,
}: {
  initialExpenses: ExpenseRow[];
  initialMeta: any;
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRow | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [openStationSelect, setOpenStationSelect] = useState(false);
  const [approvingExpenseId, setApprovingExpenseId] = useState<string | null>(null);
  const [approveConfirmOpenId, setApproveConfirmOpenId] = useState<string | null>(null);

  const { data: expenses, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<ExpenseRow>({
    baseUrl: "/api/tenant/expenses",
  });

  useEffect(() => {
    setInitialData(initialExpenses, initialMeta);
  }, [initialExpenses, initialMeta, setInitialData]);

  const form = useForm({
    resolver: zodResolver(RecordExpenseSchema),
    defaultValues: { paymentMethod: "CASH", stationId: "", category: "OTHER", amount: undefined, description: "", receiptUrl: "" },
  });

  const { register, formState: { errors, isSubmitting }, control } = form;

  const handleRecordExpense = form.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/expenses", values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleApproveExpense = async (expenseId: string, status: "APPROVED" | "REJECTED") => {
    setApprovingExpenseId(expenseId);
    const res = await apiPost(`/api/tenant/expenses/${expenseId}/approve`, { status });
    setApprovingExpenseId(null);
    if (res.error) {
      alert(res.error.message);
    } else {
      setApproveConfirmOpenId(null);
      setActiveDialog(null);
      router.refresh();
    }
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedExpense(null);
    setApiError(null);
    form.reset({ paymentMethod: "CASH", stationId: "", category: "OTHER", amount: undefined, description: "", receiptUrl: "" });
    router.refresh();
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
        return (
          <Badge variant="outline">
            {PAYMENT_METHOD_MAP[method as keyof typeof PAYMENT_METHOD_MAP] || method}
          </Badge>
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

            {exp.status === "APPROVED" ? (
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="size-3" />
                <span className="font-semibold">
                  {approvedUser
                    ? `${approvedUser.firstName ?? ""} ${approvedUser.lastName ?? ""}`.trim()
                    : "Yes"}
                </span>
              </div>
            ) : exp.status === "REJECTED" ? (
              <div className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle className="size-3" />
                <span>Rejected</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                <AlertCircle className="size-3" />
                <span>Pending Approval</span>
              </div>
            )}
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
        description="Monitor and approve local station cash expenditures and payouts."
        filterColumnId="station_name"
        searchPlaceholder="Search by station name…"
        headerAction={
          <Button onClick={() => setActiveDialog("create")}>
            <Plus size={16} className="mr-1" /> Record Expense
          </Button>
        }
      />

      {/* ==========================================
          CREATE EXPENSE DIALOG
      ========================================== */}
      {activeDialog === "create" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Record Petty Cash Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecordExpense} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="e_stat" className={errors.stationId ? "text-destructive" : ""}>
                  Select Station *
                </Label>
                <Controller
                  control={control}
                  name="stationId"
                  render={({ field }) => {
                    const selectedStation = stations.find((s) => s.id === field.value);
                    const displayLabel = selectedStation
                      ? `${selectedStation.name} (${selectedStation.code})`
                      : "Select a station...";
                    return (
                      <Popover open={openStationSelect} onOpenChange={setOpenStationSelect}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={`w-full justify-between font-normal ${
                              errors.stationId ? "border-destructive" : ""
                            }`}
                          >
                            <span className="truncate">{displayLabel}</span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search station..." />
                            <CommandList>
                              <CommandEmpty>No station found.</CommandEmpty>
                              <CommandGroup>
                                {stations.map((s) => {
                                  const label = `${s.name} (${s.code})`;
                                  return (
                                    <CommandItem
                                      key={s.id}
                                      value={label.toLowerCase()}
                                      onSelect={() => {
                                        form.setValue("stationId", s.id, { shouldValidate: true });
                                        setOpenStationSelect(false);
                                      }}
                                      data-checked={field.value === s.id}
                                    >
                                      {label}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
                {errors.stationId && (
                  <p className="text-xs text-destructive">{errors.stationId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="e_cat" className={errors.category ? "text-destructive" : ""}>
                    Expense Category *
                  </Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="e_cat" className={errors.category ? "border-destructive w-full" : "w-full"}>
                          <SelectValue placeholder="Select Category..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FUEL_FOR_GEN">Generator Fuel</SelectItem>
                          <SelectItem value="MAINTENANCE">Equipment Maintenance</SelectItem>
                          <SelectItem value="UTILITIES">Utilities (Water, Power)</SelectItem>
                          <SelectItem value="STATIONERY">Stationery</SelectItem>
                          <SelectItem value="OTHER">Other Expenses</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category && (
                    <p className="text-xs text-destructive">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="e_pay" className={errors.paymentMethod ? "text-destructive" : ""}>
                    Payment Method *
                  </Label>
                  <Controller
                    control={control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="e_pay" className={errors.paymentMethod ? "border-destructive w-full" : "w-full"}>
                          <SelectValue placeholder="Select Method..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="POS">POS Machine</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.paymentMethod && (
                    <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="e_amt" className={errors.amount ? "text-destructive" : ""}>
                  Amount *
                </Label>
                <Controller
                  control={control}
                  name="amount"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <NumberInput
                      id="e_amt"
                      placeholder="e.g. 15000"
                      value={value as number }
                      onChange={onChange}
                      onBlur={onBlur}
                      className={errors.amount ? "border-destructive" : ""}
                    />
                  )}
                />
                {errors.amount && (
                  <p className="text-xs text-destructive">{errors.amount.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="e_desc" className={errors.description ? "text-destructive" : ""}>
                  Description Details *
                </Label>
                <Textarea
                  id="e_desc"
                  placeholder="e.g. Purchased office envelopes and clipboards"
                  {...register("description")}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <SpinnerEllipsis />
                      <span>Recording...</span>
                    </>
                  ) : (
                    "Record Payout"
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
              {currentSelectedExpense.status === "PENDING" && (
                <div className="flex items-center gap-2 mr-auto">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handleApproveExpense(currentSelectedExpense.id, "REJECTED")}
                    disabled={approvingExpenseId === currentSelectedExpense.id}
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleApproveExpense(currentSelectedExpense.id, "APPROVED")}
                    disabled={approvingExpenseId === currentSelectedExpense.id}
                  >
                    Approve
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

