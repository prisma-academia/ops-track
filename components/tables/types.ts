import type { LucideIcon } from "lucide-react";

export type FacetedOption = {
  label: string;
  value: string;
  icon?: LucideIcon;
};

/**
 * Describes a column that should get a checkbox "faceted filter" in the
 * toolbar — e.g. Status, Product, Region. The available options are either
 * provided up-front or derived automatically from the data via
 * `column.getFacetedUniqueValues()`.
 */
export type DataTableFilterField<TData> = {
  /** Must match the column's `id` (or `accessorKey`). */
  id: Extract<keyof TData, string> | (string & {});
  /** Label shown in the toolbar button and popover heading. */
  label: string;
  options?: FacetedOption[];
};
