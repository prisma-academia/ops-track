import { TableDemoClient } from "./table-demo-client";

export default function TableDemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Table Demo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A preview of the new reusable <code>components/tables</code> data
          table — search, checkbox filters, sortable columns, and a
          drag-to-reorder column visibility menu. This will power every
          reports table going forward.
        </p>
      </div>
      <TableDemoClient />
    </div>
  );
}
