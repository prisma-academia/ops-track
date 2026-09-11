"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { apiGet, apiPut } from "@/lib/client/api";
import { Search, Building2, Loader2, MapPin } from "lucide-react";

type StationOption = {
  id: string;
  name: string;
  code: string;
  location?: string | null;
  state?: string | null;
};

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
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initiallyAssignedIds));
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prevAccountId, setPrevAccountId] = useState(accountId);

  if (prevAccountId !== accountId) {
    setPrevAccountId(accountId);
    setSelected(new Set(initiallyAssignedIds));
    setSearchQuery("");
  }

  useEffect(() => {
    let cancelled = false;
    if (!isOpen) return;

    apiGet<StationOption[]>("/api/tenant/stations?page=1&take=100")
      .then((res) => {
        if (cancelled) return;
        setStations(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load stations");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return stations;
    return stations.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const codeMatch = s.code.toLowerCase().includes(q);
      const locationMatch = s.location ? s.location.toLowerCase().includes(q) : false;
      const stateMatch = s.state ? s.state.toLowerCase().includes(q) : false;
      return nameMatch || codeMatch || locationMatch || stateMatch;
    });
  }, [stations, searchQuery]);

  const allFilteredSelected =
    filteredStations.length > 0 &&
    filteredStations.every((s) => selected.has(s.id));

  const someFilteredSelected =
    filteredStations.some((s) => selected.has(s.id)) && !allFilteredSelected;

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const s of filteredStations) {
          next.delete(s.id);
        }
      } else {
        for (const s of filteredStations) {
          next.add(s.id);
        }
      }
      return next;
    });
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await apiPut(`/api/tenant/bank-accounts/${accountId}/stations`, {
        stationIds: Array.from(selected),
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 gap-5">
        <DialogHeader className="gap-1.5 pb-2 border-b">
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Assign Stations
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select stations where this bank account should be available for POS and transfer collections.
          </DialogDescription>
          <div className="flex items-center gap-2 mt-1 px-3 py-2 rounded-md bg-muted/60 text-sm">
            <Building2 className="size-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-foreground">{accountLabel}</span>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stations by name, code, or location..."
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Badge variant="outline" className="shrink-0 text-xs font-normal">
              {selected.size} of {stations.length} selected
            </Badge>
          </div>

          <div className="border rounded-md overflow-hidden flex flex-col flex-1 min-h-[220px] max-h-[360px]">
            <div className="overflow-y-auto flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-background/95 backdrop-blur-xs z-10 shadow-xs">
                  <TableRow>
                    <TableHead className="w-[48px] px-3">
                      <Checkbox
                        checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                        aria-label="Select all stations"
                        disabled={loading || filteredStations.length === 0}
                      />
                    </TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="w-[110px] text-right pr-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-36 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="size-5 animate-spin text-primary" />
                          <span className="text-sm">Loading stations…</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredStations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center text-sm text-muted-foreground">
                        {stations.length === 0
                          ? "No stations found in this organization."
                          : "No stations match your search query."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStations.map((s) => {
                      const isAssigned = selected.has(s.id);
                      return (
                        <TableRow
                          key={s.id}
                          data-state={isAssigned ? "selected" : undefined}
                          onClick={() => toggle(s.id)}
                          className="cursor-pointer transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted/30"
                        >
                          <TableCell className="px-3" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={isAssigned}
                              onCheckedChange={() => toggle(s.id)}
                              aria-label={`Select station ${s.name}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{s.name}</span>
                              <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {s.code}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {s.location || s.state ? (
                              <span className="flex items-center gap-1 truncate max-w-[200px]">
                                <MapPin className="size-3 shrink-0 text-muted-foreground/70" />
                                {s.location || s.state}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            {isAssigned ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-normal text-xs"
                              >
                                Assigned
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-border text-muted-foreground font-normal text-xs"
                              >
                                Unassigned
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-2 border-t">
          <div>
            {selected.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                onClick={clearSelection}
                disabled={saving || loading}
              >
                Clear all
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="gap-1.5"
            >
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              {saving ? "Saving…" : "Save assignments"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
