"use client";

import { useEffect } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, CrownIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TenantUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  isOwner: boolean;
  status: string;
  lastLoginAt: string | null;
  role?: string | null;
};

const columns: ColumnDef<TenantUserRow>[] = [
  {
    id: "user",
    header: "User",
    accessorFn: (r) => `${r.firstName ?? ""} ${r.lastName ?? ""} ${r.email}`,
    cell: ({ row }) => {
      const u = row.original;
      const fullName = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
      const displayName = fullName || u.email.split("@")[0];

      return (
        <div className="flex items-center gap-3 py-1 min-w-0">
          <div className="relative shrink-0">
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-border/40 font-medium">
              <HugeiconsIcon icon={UserIcon} size={18} />
            </div>
            {u.isOwner && (
              <span
                className="absolute -bottom-1 -right-1 flex items-center justify-center size-4 rounded-full bg-amber-500 text-white shadow-xs ring-2 ring-background cursor-help"
                title="Owner"
              >
                <HugeiconsIcon icon={CrownIcon} size={10} strokeWidth={2.2} />
              </span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-foreground text-sm leading-tight truncate">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground truncate">{u.email}</span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.original.role || (row.original.isOwner ? "Owner" : "User");
      const isOwner = row.original.isOwner || role.toLowerCase() === "owner";
      const isAdmin = role.toLowerCase().includes("admin");

      return (
        <Badge
          variant="outline"
          className={cn(
            "font-medium text-xs border capitalize",
            isOwner
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
              : isAdmin
              ? "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
              : "border-border/70 bg-muted/40 text-foreground"
          )}
        >
          {role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = (row.original.status || "ACTIVE").toUpperCase();
      const isActive = status === "ACTIVE";
      const isSuspended = status === "SUSPENDED" || status === "BANNED";

      return (
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
            isActive
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
              : isSuspended
              ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
              : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full shrink-0",
              isActive ? "bg-emerald-500" : isSuspended ? "bg-rose-500" : "bg-amber-500"
            )}
          />
          {status.toLowerCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "lastLoginAt",
    header: "Last login",
    cell: (info) => {
      const v = info.getValue() as string | null;
      return <span className="text-xs text-muted-foreground">{v ? new Date(v).toLocaleString() : "—"}</span>;
    },
  },
];

export function TenantUsersTable({
  initialData,
  initialMeta,
  moduleContext,
  detailBase = "/admin/users",
}: {
  initialData: TenantUserRow[];
  initialMeta: any;
  moduleContext: "STATION" | "FLEET";
  detailBase?: string;
}) {
  const { data, meta, isLoading, setPage, setPageSize, setInitialData } = usePaginatedQuery<TenantUserRow>({
    baseUrl: "/api/tenant/users",
    additionalParams: { module: moduleContext },
  });

  useEffect(() => {
    setInitialData(initialData, initialMeta);
  }, [initialData, initialMeta, setInitialData]);

  return (
    <DataTable
      columns={columns}
      data={data.length > 0 ? data : initialData}
      isLoading={isLoading}
      serverPagination={{
        ...meta,
        onPageChange: setPage,
        onPageSizeChange: setPageSize,
      }}
      rowHref={(u) => `${detailBase}/${u.id}`}
      filterColumnId="user"
      searchPlaceholder="Search by name or email…"
    />
  );
}

