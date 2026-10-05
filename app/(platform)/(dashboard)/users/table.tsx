"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { HugeiconsIcon } from "@hugeicons/react";
import { UserIcon, CrownIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PlatformUserRow = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
  isSuperAdmin: boolean;
  lastLoginAt: string | null;
};

const columns: ColumnDef<PlatformUserRow>[] = [
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
            {u.isSuperAdmin && (
              <span
                className="absolute -bottom-1 -right-1 flex items-center justify-center size-4 rounded-full bg-amber-500 text-white shadow-xs ring-2 ring-background cursor-help"
                title="Super Admin"
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
      const isSuperAdmin = row.original.isSuperAdmin;
      return (
        <Badge
          variant="outline"
          className={cn(
            "font-medium text-xs border capitalize",
            isSuperAdmin
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
              : "border-border/70 bg-muted/40 text-foreground"
          )}
        >
          {isSuperAdmin ? "Super Admin" : "Platform User"}
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

export function UsersTable({ data }: { data: PlatformUserRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(u) => `/users/${u.id}`}
      filterColumnId="user"
      searchPlaceholder="Search by name or email…"
    />
  );
}

