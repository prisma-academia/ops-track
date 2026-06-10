"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, CheckCircle2, AlertCircle } from "lucide-react";

const RecordExpenseSchema = z.object({
  stationId: z.string().min(1),
  category: z.enum(["FUEL_FOR_GEN", "MAINTENANCE", "UTILITIES", "STATIONERY", "OTHER"]),
  paymentMethod: z.enum(["CASH", "POS"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(2).max(500),
  receiptUrl: z.string().optional().or(z.literal("")),
});

function getOrdinalSuffix(day: number) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

function formatHumanReadableDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;

  return `${month} ${day}${getOrdinalSuffix(day)} ${year} ${hours}:${minutesStr}${ampm}`;
}

export function ExpensesManager({
  initialExpenses,
  stations,
}: {
  initialExpenses: any[];
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [expenses] = useState<any[]>(initialExpenses);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(RecordExpenseSchema),
    defaultValues: { paymentMethod: "CASH" },
  });

  const handleRecordExpense = form.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/expenses", values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleApproveExpense = async (expenseId: string, approved: boolean) => {
    const res = await apiPost(`/api/tenant/expenses/${expenseId}/approve`, { approved });
    if (res.error) {
      alert(res.error.message);
    } else {
      router.refresh();
    }
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setApiError(null);
    form.reset({ paymentMethod: "CASH" });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Local Expenses"
        description="Monitor and approve local station cash expenditures and payouts."
        action={
          <Button onClick={() => setActiveDialog("create")}>
            <Plus size={16} className="mr-1" /> Record Expense
          </Button>
        }
      />

      <Card className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Date</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Station</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Category</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Method</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase text-right">Amount</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Description</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Recorded By</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Approved By</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-6 text-center text-stone-500">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const approved = !!exp.approvedById;
                  return (
                    <tr key={exp.id} className="hover:bg-stone-50/50">
                      <td className="px-6 py-3 whitespace-nowrap">{formatHumanReadableDate(exp.createdAt)}</td>
                      <td className="px-6 py-3">
                        <span className="font-semibold text-stone-800">{exp.station.name}</span>
                        <span className="text-[10px] text-stone-500 block font-mono">{exp.station.code}</span>
                      </td>
                      <td className="px-6 py-3 text-xs font-mono">{exp.category}</td>
                      <td className="px-6 py-3 text-xs">{exp.paymentMethod}</td>
                      <td className="px-6 py-3 text-right font-bold text-stone-800">
                        {Number(exp.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 max-w-xs truncate" title={exp.description}>
                        {exp.description}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        {exp.recordedBy
                          ? `${exp.recordedBy.firstName ?? ""} ${exp.recordedBy.lastName ?? ""}`.trim()
                          : "—"}
                      </td>
                      <td className="px-6 py-3 text-xs">
                        {approved ? (
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 size={12} />
                            {exp.approvedBy
                              ? `${exp.approvedBy.firstName ?? ""} ${exp.approvedBy.lastName ?? ""}`.trim()
                              : "Yes"}
                          </span>
                        ) : (
                          <span className="text-stone-400 flex items-center gap-1">
                            <AlertCircle size={12} /> Pending Approval
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {!approved && (
                          <Button size="xs" onClick={() => handleApproveExpense(exp.id, true)}>
                            Approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ==========================================
          CREATE EXPENSE DIALOG
      ========================================== */}
      {activeDialog === "create" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Petty Cash Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRecordExpense} className="space-y-4">
              <FormField
                label="Select Station"
                htmlFor="e_stat"
                error={form.formState.errors.stationId?.message}
              >
                <select
                  id="e_stat"
                  className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                  {...form.register("stationId")}
                >
                  <option value="">Select Station...</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Expense Category"
                  htmlFor="e_cat"
                  error={form.formState.errors.category?.message}
                >
                  <select
                    id="e_cat"
                    className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                    {...form.register("category")}
                  >
                    <option value="">Select Category...</option>
                    <option value="FUEL_FOR_GEN">Generator Fuel</option>
                    <option value="MAINTENANCE">Equipment Maintenance</option>
                    <option value="UTILITIES">Utilities (Water, Power)</option>
                    <option value="STATIONERY">Stationery</option>
                    <option value="OTHER">Other Expenses</option>
                  </select>
                </FormField>

                <FormField
                  label="Payment Method"
                  htmlFor="e_pay"
                  error={form.formState.errors.paymentMethod?.message}
                >
                  <select
                    id="e_pay"
                    className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
                    {...form.register("paymentMethod")}
                  >
                    <option value="CASH">Cash</option>
                    <option value="POS">POS Machine</option>
                  </select>
                </FormField>
              </div>

              <FormField
                label="Amount"
                htmlFor="e_amt"
                error={form.formState.errors.amount?.message}
              >
                <TextInput id="e_amt" type="number" placeholder="e.g. 15000" {...form.register("amount")} />
              </FormField>

              <FormField
                label="Description Details"
                htmlFor="e_desc"
                error={form.formState.errors.description?.message}
              >
                <TextInput
                  id="e_desc"
                  placeholder="e.g. Purchased office envelopes and clipboards"
                  {...form.register("description")}
                />
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Record Payout</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
