"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { CreditCard, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useRouter, useSearchParams } from "next/navigation";

export type PaymentRow = {
  id: string;
  reference: string;
  type: string; // INFLOW | OUTFLOW
  category: string;
  amount: number;
  paymentMethod: string;
  bankAccount: string | null;
  createdAt: string;
};

const columns: ColumnDef<PaymentRow>[] = [
  { 
    accessorKey: "reference", 
    header: "Transaction Ref",
    cell: ({ row }) => {
      const ref = row.original.reference;
      const isOutflow = row.original.type === "OUTFLOW";
      return (
        <div className="flex items-center gap-3 py-1">
          <div className={`size-10 flex items-center justify-center shrink-0 rounded-md ${isOutflow ? 'text-red-600 bg-red-600/10' : 'text-green-600 bg-green-600/10'}`}>
            {isOutflow ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{ref}</span>
            <span className="text-xs text-muted-foreground">
              {row.original.paymentMethod || "Bank Transfer"}
              {row.original.bankAccount ? ` • ${row.original.bankAccount}` : ""}
            </span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "category", 
    header: "Category",
    cell: ({ row }) => {
      const cat = row.original.category.replace(/_/g, " ");
      return <span className="capitalize">{cat.toLowerCase()}</span>;
    }
  },
  { 
    accessorKey: "amount", 
    header: "Amount",
    cell: ({ row }) => {
      const amount = row.original.amount;
      const isOutflow = row.original.type === "OUTFLOW";
      return (
        <span className={isOutflow ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
          {isOutflow ? "-" : "+"}₦{amount.toLocaleString()}
        </span>
      );
    }
  },
  { 
    accessorKey: "type", 
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge variant={type === "INFLOW" ? "default" : "secondary"} className={type === "INFLOW" ? "bg-green-600/10 text-green-700 hover:bg-green-600/20" : "bg-red-600/10 text-red-700 hover:bg-red-600/20"}>
          {type}
        </Badge>
      );
    }
  },
  { 
    accessorKey: "createdAt", 
    header: "Date",
    cell: ({ row }) => {
      const dateStr = row.original.createdAt;
      const date = new Date(dateStr);
      return (
        <div className="flex flex-col">
          <span>{date.toLocaleDateString()}</span>
          <span suppressHydrationWarning className="text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
      );
    }
  },
];

export function PaymentsTable({ data, filterNode, serverPagination }: { data: PaymentRow[], filterNode?: React.ReactNode, serverPagination?: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const handlePageSizeChange = (newSize: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("take", newSize.toString());
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(s) => `/admin/fleet/payments/${s.id}`}
      filterColumnId="reference"
      searchPlaceholder="Search by reference…"
      filterNode={filterNode}
      {...(serverPagination ? {
        serverPagination: {
          ...serverPagination,
          onPageChange: handlePageChange,
          onPageSizeChange: handlePageSizeChange,
        }
      } : {})}
    />
  );
}
