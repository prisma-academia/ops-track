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
import { Plus, User, DollarSign } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";

const CreateCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  outstandingBalance: z.coerce.number().default(0),
});

export function CustomersManager({
  initialCustomers,
}: {
  initialCustomers: any[];
}) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: { outstandingBalance: 0 },
  });

  const handleCreateCustomer = form.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/customers", values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const closeDialog = () => {
    setActiveDialog(null);
    setApiError(null);
    form.reset({ outstandingBalance: 0 });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="B2B Customers"
        description="Manage corporate customer accounts and track outstanding balances."
        action={
          <Button onClick={() => setActiveDialog("create")}>
            <Plus size={16} className="mr-1" /> Add Customer
          </Button>
        }
      />

      <Card className="overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b">
              <tr>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Customer Name</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase text-right">Outstanding Balance</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Date Created</th>
                <th className="px-6 py-3 font-bold text-stone-600 text-xs uppercase">Customer ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {initialCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-center text-stone-500">
                    No B2B customer accounts created yet.
                  </td>
                </tr>
              ) : (
                initialCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                          <User size={16} />
                        </div>
                        <span className="font-semibold text-stone-800">{c.name}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-3 text-right font-mono font-bold text-sm ${
                      Number(c.outstandingBalance) > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}>
                      {Number(c.outstandingBalance).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-400 font-mono">
                      {c.id}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ==========================================
          CREATE CUSTOMER DIALOG
      ========================================== */}
      {activeDialog === "create" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add B2B Customer Account</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <FormField
                label="Company / Customer Name"
                htmlFor="c_name"
                error={form.formState.errors.name?.message}
              >
                <TextInput id="c_name" placeholder="e.g. Dangote Logistics Ltd" {...form.register("name")} />
              </FormField>

              <FormField
                label="Opening Outstanding Balance"
                htmlFor="c_bal"
                error={form.formState.errors.outstandingBalance?.message}
              >
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400">
                    <DollarSign size={14} />
                  </span>
                  <TextInput id="c_bal" type="number" className="pl-8" placeholder="0" {...form.register("outstandingBalance")} />
                </div>
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <SpinnerEllipsis />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    "Create Customer"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
