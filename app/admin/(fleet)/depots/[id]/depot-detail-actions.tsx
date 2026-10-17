"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditDepotDialog, type DepotEditInitial } from "./edit-depot-dialog";

export function DepotDetailActions({
  depot,
  canEdit,
}: {
  depot: DepotEditInitial;
  canEdit: boolean;
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <Badge variant="secondary">Depot</Badge>
      {canEdit && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          Edit details
        </Button>
      )}
      {canEdit && (
        <EditDepotDialog open={editOpen} onOpenChange={setEditOpen} depot={depot} />
      )}
    </>
  );
}
