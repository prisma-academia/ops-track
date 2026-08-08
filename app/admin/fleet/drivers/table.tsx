"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Users as UserIcon, Edit, Ban, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiPatch } from "@/lib/client/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type DriverRow = {
  id: string;
  name: string;
  transporterName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiryDate: string | null;
  status: string;
  isActive: boolean;
  transportCount: number;
  createdAt: string;
};

function ToggleDriverStatusAction({ driver }: { driver: DriverRow }) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);
  const [open, setOpen] = useState(false);
  const isCurrentlyActive = driver.isActive;

  const handleToggle = async () => {
    setIsToggling(true);
    const res = await apiPatch(`/api/tenant/fleet/drivers/${driver.id}`, { isActive: !isCurrentlyActive });
    setIsToggling(false);
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success(`Driver ${isCurrentlyActive ? 'deactivated' : 'activated'} successfully`);
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          {isCurrentlyActive ? (
            <Ban className="w-4 h-4 text-destructive" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {isCurrentlyActive
              ? "This will deactivate this driver. They will be hidden from selection dropdowns."
              : "This will reactivate this driver, making them available again."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isToggling}>Cancel</AlertDialogCancel>
          <Button variant={isCurrentlyActive ? "destructive" : "default"} onClick={handleToggle} disabled={isToggling}>
            {isToggling ? (isCurrentlyActive ? "Deactivating..." : "Activating...") : (isCurrentlyActive ? "Deactivate" : "Activate")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const columns: ColumnDef<DriverRow>[] = [
  { 
    accessorKey: "name", 
    header: "Driver Name",
    cell: ({ row }) => {
      const name = row.original.name;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="size-10 flex items-center justify-center shrink-0 text-primary bg-primary/10 rounded-md">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">{name}</span>
            <span className="text-xs text-muted-foreground">{row.original.transporterName}</span>
          </div>
        </div>
      );
    }
  },
  { 
    accessorKey: "phone", 
    header: "Phone",
    cell: ({ row }) => row.original.phone
  },
  { 
    accessorKey: "licenseNumber", 
    header: "License No.",
    cell: ({ row }) => {
      const num = row.original.licenseNumber;
      if (num === "-") return <span className="text-muted-foreground">-</span>;

      const expiry = row.original.licenseExpiryDate;
      let isExpired = false;

      if (expiry) {
        const expiryDate = new Date(expiry);
        const now = new Date();
        isExpired = expiryDate < now;
      }

      return (
        <div className="flex flex-col gap-1 items-start">
          <span className="text-sm">{num}</span>
          {expiry ? (
            isExpired ? (
              <Badge variant="destructive" className="text-[10px] h-4 px-1 py-0">Expired</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] h-4 px-1 py-0 border-emerald-200 text-emerald-600 bg-emerald-50">Active</Badge>
            )
          ) : null}
        </div>
      );
    }
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const isActive = row.original.isActive;
      if (!isActive) {
        return <Badge variant="destructive">Deactivated</Badge>;
      }
      return (
        <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>
          {status}
        </Badge>
      );
    }
  },
  { 
    accessorKey: "transportCount", 
    header: "Trips",
    cell: ({ row }) => row.original.transportCount
  },
  { 
    accessorKey: "createdAt", 
    header: "Added",
    cell: ({ row }) => {
      const dateStr = row.original.createdAt;
      const date = new Date(dateStr);
      return (
        <div className="flex flex-col">
          <span>{date.toLocaleDateString()}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(date, { addSuffix: true })}
          </span>
        </div>
      );
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const driver = row.original;
      return (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/fleet/drivers/${driver.id}/edit`}>
              <Edit className="w-4 h-4 text-muted-foreground" />
            </Link>
          </Button>
          <ToggleDriverStatusAction driver={driver} />
        </div>
      );
    }
  }
];

export function DriversTable({ data, serverPagination, filterNode }: { data: DriverRow[]; serverPagination?: any; filterNode?: React.ReactNode }) {
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
      rowHref={(s) => `/admin/fleet/drivers/${s.id}`}
      filterColumnId="name"
      searchPlaceholder="Search by name…"
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
