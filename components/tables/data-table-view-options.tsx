"use client";

import * as React from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CheckIcon, GripVerticalIcon, Settings2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDataTable } from "./data-table-context";

/**
 * "Checking and unchecking" toggle for column visibility, plus drag-and-drop
 * for column arrangement (order) — matches the openstatus data-table-filters
 * view-options design (Settings2 trigger + cmdk list + drag handles).
 */
export function DataTableViewOptions<TData>() {
  const { table, enableColumnOrdering } = useDataTable<TData>();
  const [open, setOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor)
  );

  const columnOrder = table.getState().columnOrder;

  const hideableColumns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide()
        )
        .sort((a, b) => columnOrder.indexOf(a.id) - columnOrder.indexOf(b.id)),
    [table, columnOrder]
  );

  function handleDragEnd(event: DragEndEvent) {
    setDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = hideableColumns.map((c) => c.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const newOrder = arrayMove(ids, oldIndex, newIndex);

    // Keep any non-hideable columns (e.g. select/actions) pinned in place.
    const fullOrder = columnOrder.length
      ? columnOrder
      : table.getAllColumns().map((c) => c.id);
    const merged = fullOrder.filter((id) => !ids.includes(id));
    let cursor = 0;
    const result = fullOrder.map((id) =>
      ids.includes(id) ? newOrder[cursor++] : id
    );
    table.setColumnOrder(result.length ? result : merged);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon-lg"
              role="combobox"
              aria-expanded={open}
              className="cursor-pointer"
            >
              <Settings2Icon className="size-4" />
              <span className="sr-only">Toggle columns</span>
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Toggle columns & order</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-52 p-0">
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search columns..."
          />
          <CommandList>
            <CommandEmpty>No column found.</CommandEmpty>
            <CommandGroup>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragStart={() => setDragging(true)}
                onDragCancel={() => setDragging(false)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={hideableColumns.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {hideableColumns.map((column) => (
                    <SortableColumnItem
                      key={column.id}
                      id={column.id}
                      label={
                        (column.columnDef.meta as { label?: string } | undefined)
                          ?.label || column.id
                      }
                      checked={column.getIsVisible()}
                      disabled={dragging}
                      draggable={enableColumnOrdering && !search}
                      onToggle={() =>
                        column.toggleVisibility(!column.getIsVisible())
                      }
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SortableColumnItem({
  id,
  label,
  checked,
  disabled,
  draggable,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  draggable: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CommandItem
        value={label}
        onSelect={onToggle}
        disabled={disabled}
        // REMINDER: hides <CommandItem>'s own built-in trailing checkmark
        // (rendered as the literal last child) so our drag handle can sit
        // flush against the far right edge of the row.
        className="capitalize [&>svg:last-child]:hidden"
      >
        <div
          className={cn(
            "flex size-4 items-center justify-center rounded-sm border border-primary",
            checked
              ? "bg-primary text-primary-foreground"
              : "opacity-50 [&_svg]:invisible"
          )}
        >
          <CheckIcon className="size-3.5" />
        </div>
        <span>{label}</span>
        {draggable ? (
          <button
            type="button"
            className="ml-auto flex size-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : null}
      </CommandItem>
    </div>
  );
}
