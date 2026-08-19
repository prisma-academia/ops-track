"use client";

import type { Column } from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  EyeOffIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn("text-xs font-semibold", className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    // REMINDER: negative margin cancels out the parent <TableHead>'s `px-2` /
    // `h-10` so the button below fills the *entire* header cell, making the
    // whole field clickable/sortable rather than just the label + icon.
    <div className={cn("-mx-2 flex h-full items-stretch", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-full w-full cursor-pointer justify-start gap-1.5 rounded-none px-2 text-xs font-semibold data-[state=open]:bg-muted"
          >
            <span className="flex-1 truncate text-left">{title}</span>
            {sorted === "desc" ? (
              <ArrowDownIcon className="size-3.5 shrink-0" />
            ) : sorted === "asc" ? (
              <ArrowUpIcon className="size-3.5 shrink-0" />
            ) : (
              <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-36">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUpIcon className="size-3.5 text-muted-foreground" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDownIcon className="size-3.5 text-muted-foreground" />
            Desc
          </DropdownMenuItem>
          {column.getCanHide() ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                <EyeOffIcon className="size-3.5 text-muted-foreground" />
                Hide
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
