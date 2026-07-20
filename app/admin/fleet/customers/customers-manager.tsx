"use client";

import { useState, useEffect } from "react";
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
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";

const CreateCustomerSchema = z.object({
  name: z.string().min(2).max(100),
  outstandingBalance: z.coerce.number().default(0),
});

export type CustomerRow = {
  id: string;
  name: string;
  outstandingBalance: number | string;
  createdAt: string;
};

const columns: ColumnDef<CustomerRow>[] = [
  {
    accessorKey: "name",
    header: "Customer Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="size-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
          <User size={16} />
        </div>
        <span className="font-semibold text-stone-800">{row.original.name}</span>
      </div>
    ),
  },
  {
    accessorKey: "outstandingBalance",
    header: () => <div className="text-right">Outstanding Balance</div>,
    cell: ({ row }) => {
      const bal = Number(row.original.outstandingBalance);
      return (
        <div className={`text-right font-mono font-bold text-sm ${bal > 0 ? "text-rose-600" : "text-emerald-600"}`}>
          {bal.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Date Created",
    cell: ({ row }) => (
      <span className="text-xs text-stone-500">
        {new Date(row.original.createdAt).toLocaleDateString()}
      </span>
    ),
  },
  {
    accessorKey: "id",
    header: "Customer ID",
    cell: ({ row }) => (
      <span className="text-xs text-stone-400 font-mono">
        {row.original.id}
      </span>
    ),
  },
];

export function CustomersManager({
  initialCustomers,
  initialMeta,
}: {
  initialCustomers: any[];
  initialMeta: any;
}) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<CustomerRow>({
    baseUrl: "/api/tenant/customers",
  });

  useEffect(() => {
    setInitialData(initialCustomers, initialMeta);
  }, [initialCustomers, initialMeta, setInitialData]);

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

      <DataTable
          columns={columns}
          data={data.length > 0 ? data : initialCustomers}
          isLoading={isLoading}
          serverPagination={{
            ...meta,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          filterColumnId="name"
          searchPlaceholder="Search by name…"
        />

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
