"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TenantStatusBadge } from "../_components/tenant-status-badge";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  companyEmail: string | null;
  createdAt: string;
  logoUrl: string | null;
  ownerName: string | null;
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

const columns: ColumnDef<TenantRow>[] = [
  {
    accessorKey: "name",
    header: "Tenant",
    cell: ({ row }) => {
      const tenant = row.original;
      return (
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar size="sm" className="rounded-md after:rounded-md">
            {tenant.logoUrl ? <AvatarImage src={tenant.logoUrl} alt={tenant.name} /> : null}
            <AvatarFallback className="rounded-md text-[10px] font-semibold">
              {initials(tenant.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{tenant.name}</div>
            <div className="truncate font-mono text-xs text-muted-foreground">{tenant.slug}</div>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "ownerName",
    header: "Owner",
    cell: (info) => (
      <span className="text-sm text-foreground">{(info.getValue() as string | null) ?? "—"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <TenantStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "companyEmail",
    header: "Email",
    cell: (info) => (
      <span className="text-sm text-muted-foreground">{(info.getValue() as string) ?? "—"}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    cell: (info) => (
      <span className="text-xs text-muted-foreground">
        {new Date(info.getValue() as string).toLocaleDateString()}
      </span>
    ),
  },
];

export function TenantsTable({ data }: { data: TenantRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      rowHref={(t) => `/tenants/${t.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
    />
  );
}
