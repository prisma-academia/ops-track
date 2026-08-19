"use client";

import * as React from "react";
import { XIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useDataTable } from "./data-table-context";

/**
 * Left "Filters" sidebar — one accordion section per filter field, each with
 * a checkbox list (+ live facet counts and a hover "only" shortcut). Mirrors
 * the openstatus data-table-filters sidebar design.
 */
export function DataTableFilterControls<TData>() {
  const { filterFields } = useDataTable<TData>();

  if (!filterFields.length) return null;

  return (
    <div className="flex flex-col gap-2">
      <Accordion
        type="multiple"
        defaultValue={filterFields.map((f) => f.id as string)}
      >
        {filterFields.map((field) => (
          <AccordionItem key={field.id as string} value={field.id as string} className="-mx-2 px-2">
            <AccordionTrigger className="w-full items-center gap-2 px-2 py-0 hover:no-underline">
              <div className="flex w-full items-center justify-between gap-2 truncate py-2 pr-2">
                <p className="text-sm font-medium">{field.label}</p>
                <FilterResetBadge fieldId={field.id as string} />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-1">
                <CheckboxFilter fieldId={field.id as string} options={field.options} />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function FilterResetBadge<TData>({ fieldId }: { fieldId: string }) {
  const { table } = useDataTable<TData>();
  const column = table.getColumn(fieldId);
  const filterValue = column?.getFilterValue();
  const filters = Array.isArray(filterValue) ? filterValue : filterValue ? [filterValue] : [];

  if (filters.length === 0) return null;

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        column?.setFilterValue(undefined);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") column?.setFilterValue(undefined);
      }}
      className="inline-flex h-5 items-center gap-1 rounded-full border border-border px-1.5 font-mono text-[10px] text-muted-foreground hover:bg-muted"
    >
      <span>{filters.length}</span>
      <XIcon className="size-2.5" />
    </span>
  );
}

function CheckboxFilter<TData>({
  fieldId,
  options,
}: {
  fieldId: string;
  options?: { label: string; value: string }[];
}) {
  const { table } = useDataTable<TData>();
  const [search, setSearch] = React.useState("");
  const column = table.getColumn(fieldId);
  const facets = column?.getFacetedUniqueValues();

  const resolvedOptions =
    options && options.length > 0
      ? options
      : Array.from(facets?.keys() ?? [])
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter((value, index, arr) => arr.indexOf(value) === index)
          .map((value) => ({ label: String(value), value: String(value) }));

  const filterOptions = resolvedOptions.filter(
    (option) => search === "" || option.label.toLowerCase().includes(search.toLowerCase())
  );

  const filterValue = column?.getFilterValue();
  const filters: string[] = Array.isArray(filterValue)
    ? filterValue
    : filterValue
    ? [filterValue as string]
    : [];

  return (
    <div className="grid gap-2">
      {resolvedOptions.length > 4 ? (
        <InputGroup className="h-9 rounded-lg shadow-none">
          <InputGroupAddon>
            <SearchIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
      ) : null}
      <div className="max-h-[200px] overflow-y-auto rounded-lg border border-border empty:border-none">
        {filterOptions.map((option, index) => {
          const checked = filters.includes(option.value);
          return (
            <div
              key={option.value}
              className={cn(
                "group relative flex items-center gap-2 px-2 py-2.5 hover:bg-accent/50",
                index !== filterOptions.length - 1 && "border-b border-border"
              )}
            >
              <Checkbox
                id={`${fieldId}-${option.value}`}
                checked={checked}
                onCheckedChange={(isChecked) => {
                  const newValue = isChecked
                    ? [...filters, option.value]
                    : filters.filter((v) => v !== option.value);
                  column?.setFilterValue(newValue.length ? newValue : undefined);
                }}
              />
              <Label
                htmlFor={`${fieldId}-${option.value}`}
                className="flex w-full items-center justify-between gap-1 truncate text-foreground/70 group-hover:text-accent-foreground"
              >
                <span className="truncate font-normal">{option.label}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {facets?.get(option.value) ?? null}
                </span>
              </Label>
              <button
                type="button"
                onClick={() => column?.setFilterValue([option.value])}
                className="absolute inset-y-0 right-0 hidden items-center rounded-md px-2 text-xs text-muted-foreground backdrop-blur-xs hover:text-foreground group-hover:flex"
              >
                only
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
