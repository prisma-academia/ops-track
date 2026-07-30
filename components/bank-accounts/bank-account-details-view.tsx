"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, Building2, Wallet, CreditCard, Activity, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { BankAccountFormModal } from "./bank-account-form-modal";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

type BankAccountDetails = {
  account: {
    id: string;
    accountName: string;
    accountNumber: string;
    bankName: string;
    scope: "STATION" | "FLEET";
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    totalCredited: number;
    totalDebited: number;
    netBalance: number;
    transactionCount: number;
  };
  analytics: Array<{
    period: string;
    credited: number;
    debited: number;
    netFlow: number;
  }>;
  transactions: Array<{
    id: string;
    type: "CREDIT" | "DEBIT";
    amount: number;
    date: string;
    category: string;
    description: string;
    reference?: string | null;
    sourceModule: string;
    status: string;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export function BankAccountDetailsView({
  initialDetails,
  backUrl,
}: {
  initialDetails: BankAccountDetails;
  backUrl: string;
}) {
  const [details, setDetails] = useState(initialDetails);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const { account, summary, analytics, transactions } = details;

  const columns: ColumnDef<BankAccountDetails["transactions"][number]>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">
          {new Date(row.original.date).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const isCredit = row.original.type === "CREDIT";
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isCredit
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}
          >
            {isCredit ? (
              <ArrowDownLeft className="size-3" />
            ) : (
              <ArrowUpRight className="size-3" />
            )}
            {isCredit ? "Credited (Inflow)" : "Debited (Outflow)"}
          </span>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category / Source",
      cell: ({ row }) => (
        <span className="font-medium text-xs uppercase tracking-wider text-muted-foreground">
          {row.original.category.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span>{row.original.description}</span>,
    },
    {
      accessorKey: "reference",
      header: "Ref",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.reference || "—"}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const isCredit = row.original.type === "CREDIT";
        return (
          <div
            className={`text-right font-semibold font-mono ${
              isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {isCredit ? "+" : "-"}₦{row.original.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{account.bankName}</h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-primary/10 text-primary uppercase">
                {account.scope}
              </span>
              {account.isActive ? (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                  <CheckCircle2 className="size-3" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                  <XCircle className="size-3" /> Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {account.accountName} • <span className="font-mono">{account.accountNumber}</span>
            </p>
          </div>
        </div>

        <Button onClick={() => setIsEditModalOpen(true)}>Edit Details</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Credited</CardTitle>
            <ArrowDownLeft className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₦{summary.totalCredited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total inflows recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Debited</CardTitle>
            <ArrowUpRight className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              ₦{summary.totalDebited.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total outflows recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Flow Balance</CardTitle>
            <Wallet className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.netBalance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              ₦{summary.netBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Net cash position</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Activity</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.transactionCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Recorded transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cashflow Analytics</CardTitle>
          <CardDescription>Monthly breakdown of credits vs debits</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.length > 0 ? (
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, ""]}
                    contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px" }}
                  />
                  <Legend />
                  <Bar dataKey="credited" name="Credited (Inflow)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="debited" name="Debited (Outflow)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No analytical cashflow history recorded yet for this account.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions Log</CardTitle>
          <CardDescription>All inflow and outflow records linked to this account</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={transactions}
            filterColumnId="description"
            searchPlaceholder="Search transactions..."
          />
        </CardContent>
      </Card>

      <BankAccountFormModal
        tenantSlug=""
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
        initialData={{
          id: account.id,
          scope: account.scope,
          accountName: account.accountName,
          accountNumber: account.accountNumber,
          bankName: account.bankName,
          isActive: account.isActive,
        }}
        fixedScope={account.scope}
      />
    </div>
  );
}
