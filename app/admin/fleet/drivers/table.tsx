"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table";
import { Users, Edit, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { apiDelete } from "@/lib/client/api";
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
  status: string;
  transportCount: number;
  createdAt: string;
};

function DeleteDriverAction({ driverId }: { driverId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const res = await apiDelete(`/api/tenant/fleet/drivers/${driverId}`);
    setIsDeleting(false);
    if (res.error) {
      toast.error(res.error.message);
    } else {
      toast.success("Driver deleted successfully");
      setOpen(false);
      router.refresh();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this driver. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete"}
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
            <Users className="w-5 h-5" />
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
    cell: ({ row }) => row.original.licenseNumber
  },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
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
          <DeleteDriverAction driverId={driver.id} />
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
