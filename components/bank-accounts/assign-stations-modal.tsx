"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { apiGet, apiPut } from "@/lib/client/api";

type StationOption = { id: string; name: string; code: string };

export function AssignStationsModal({
  accountId,
  accountLabel,
  isOpen,
  onClose,
  onSuccess,
  initiallyAssignedIds,
}: {
  accountId: string;
  accountLabel: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initiallyAssignedIds: string[];
}) {
  const [stations, setStations] = useState<StationOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(initiallyAssignedIds));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(initiallyAssignedIds));
    setLoading(true);
    apiGet<StationOption[]>("/api/tenant/stations?page=1&take=100")
      .then((res) => {
        setStations(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => toast.error("Failed to load stations"))
      .finally(() => setLoading(false));
  }, [isOpen, initiallyAssignedIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiPut(`/api/tenant/bank-accounts/${accountId}/stations`, {
        stationIds: [...selected],
      });
      if (res.error) throw new Error(res.error.message);
      toast.success("Station assignments updated");
      onSuccess();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update assignments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign stations</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{accountLabel}</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading stations…</p>
        ) : (
          <div className="space-y-2 py-2">
            {stations.length === 0 && (
              <p className="text-sm text-muted-foreground">No stations in this organization.</p>
            )}
            {stations.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                <span>
                  {s.name} <span className="text-muted-foreground">({s.code})</span>
                </span>
              </label>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={save} disabled={saving || loading}>
            {saving ? "Saving…" : "Save assignments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
