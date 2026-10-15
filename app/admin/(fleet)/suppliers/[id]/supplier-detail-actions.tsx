"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditSupplierDialog, type SupplierEditInitial } from "./edit-supplier-dialog";

export function SupplierDetailActions({
  supplier,
  payUrl,
  canEdit,
}: {
  supplier: SupplierEditInitial;
  payUrl: string;
  canEdit: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Badge variant="secondary">Supplier</Badge>
      {canEdit && (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
          <Pencil className="size-3.5" />
          Edit details
        </Button>
      )}
      <Button asChild size="sm">
        <Link href={payUrl}>Pay supplier</Link>
      </Button>
      {canEdit && (
        <EditSupplierDialog open={editOpen} onOpenChange={setEditOpen} supplier={supplier} />
      )}
    </>
  );
}
