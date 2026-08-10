"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, CheckCircle, Play, Navigation, UserPlus } from "lucide-react";
import SpinnerEllipsis from "@/components/spinner-ellipsis";

export function TripLegsManager({ transport, drivers, stations }: { transport: any, drivers: any[], stations: any[] }) {
  const router = useRouter();
  const legs = transport.transportTripLegs || [];
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add Leg State
  const [openAddLeg, setOpenAddLeg] = useState(false);
  const [newLegType, setNewLegType] = useState("PRIMARY_TO_SUBSEQUENT");
  const [newOrigin, setNewOrigin] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [newDriverId, setNewDriverId] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Reassign State
  const [openReassign, setOpenReassign] = useState(false);
  const [activeLegId, setActiveLegId] = useState("");
  const [reassignDriverId, setReassignDriverId] = useState("");
  const [reassignNotes, setReassignNotes] = useState("");

  const handleAddLeg = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await apiPost(`/api/tenant/fleet/transports/${transport.id}/trip-legs`, {
      type: newLegType,
      origin: newOrigin,
      destination: newDestination,
      driverId: newDriverId,
      notes: newNotes || undefined
    });
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenAddLeg(false);
      router.refresh();
      setNewOrigin("");
      setNewDestination("");
      setNewDriverId("");
      setNewNotes("");
    }
  };

  const handleReassign = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await apiPost(`/api/tenant/fleet/transports/${transport.id}/trip-legs/${activeLegId}/assignments`, {
      driverId: reassignDriverId,
      notes: reassignNotes || undefined
    });
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
    } else {
      setOpenReassign(false);
      router.refresh();
      setReassignDriverId("");
      setReassignNotes("");
    }
  };

  const updateStatus = async (legId: string, status: string) => {
    const res = await apiPatch(`/api/tenant/fleet/transports/${transport.id}/trip-legs/${legId}/status`, { status });
    if (!res.error) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-2">
        <div>
          <h3 className="font-semibold text-lg">Route & Trip Legs</h3>
          <p className="text-sm text-muted-foreground">Manage multi-stage routing and driver assignments.</p>
        </div>
        <Button onClick={() => setOpenAddLeg(true)}>
          <Navigation className="h-4 w-4 mr-2" />
          Add Trip Leg
        </Button>
      </div>

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted-foreground/20 before:to-transparent">
        {legs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground bg-card border rounded-xl">
            No trip legs have been created for this transport yet.
          </div>
        ) : (
          legs.map((leg: any, idx: number) => {
            const activeAssignment = leg.driverAssignments?.find((a: any) => a.status === "ACTIVE" || a.status === "COMPLETED");
            const activeDriver = activeAssignment?.driver;

            return (
              <div key={leg.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  {leg.status === "COMPLETED" ? <CheckCircle className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant={leg.status === "COMPLETED" ? "default" : "outline"}>{leg.status}</Badge>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Leg {leg.sequence}</span>
                  </div>
                  
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium">{leg.origin || "Unknown"}</span>
                    </div>
                    <div className="w-0.5 h-3 bg-muted-foreground/30 ml-1" />
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-sm font-medium">{leg.destination || "Unknown"}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-muted/40 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Assigned Driver</p>
                      <p className="text-sm font-medium">{activeDriver ? `${activeDriver.firstName} ${activeDriver.lastName}` : "Unassigned"}</p>
                    </div>
                    {leg.status !== "COMPLETED" && leg.status !== "CANCELLED" && (
                      <Button variant="ghost" size="sm" onClick={() => { setActiveLegId(leg.id); setOpenReassign(true); }}>
                        <UserPlus className="w-4 h-4 mr-2" /> Swap
                      </Button>
                    )}
                  </div>

                  {leg.status !== "COMPLETED" && leg.status !== "CANCELLED" && (
                    <div className="flex gap-2 mt-4">
                      {leg.status === "PENDING" || leg.status === "ASSIGNED" ? (
                        <Button size="sm" className="w-full" onClick={() => updateStatus(leg.id, "IN_PROGRESS")}>
                          <Play className="w-4 h-4 mr-2" /> Start Leg
                        </Button>
                      ) : (
                        <Button size="sm" variant="default" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => updateStatus(leg.id, "COMPLETED")}>
                          <CheckCircle className="w-4 h-4 mr-2" /> Complete Leg
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Leg Modal */}
      <Dialog open={openAddLeg} onOpenChange={setOpenAddLeg}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Trip Leg</DialogTitle>
            <DialogDescription>Create a new leg for this transport.</DialogDescription>
          </DialogHeader>
          {error && <div className="text-destructive text-sm font-medium">{error}</div>}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Leg Type</Label>
              <Select value={newLegType} onValueChange={setNewLegType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIMARY_TO_SUBSEQUENT">Primary to Subsequent</SelectItem>
                  <SelectItem value="SUBSEQUENT_TO_SUBSEQUENT">Subsequent to Subsequent</SelectItem>
                  <SelectItem value="DESTINATION_TO_ORIGIN">Return to Origin</SelectItem>
                  <SelectItem value="ORIGIN_TO_DEPOT">Origin to Depot</SelectItem>
                  <SelectItem value="DEPOT_TO_PRIMARY">Depot to Primary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Origin</Label>
                <Input value={newOrigin} onChange={(e) => setNewOrigin(e.target.value)} placeholder="e.g. Station A" />
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input value={newDestination} onChange={(e) => setNewDestination(e.target.value)} placeholder="e.g. Station B" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assign Driver</Label>
              <Select value={newDriverId} onValueChange={setNewDriverId}>
                <SelectTrigger><SelectValue placeholder="Select driver..." /></SelectTrigger>
                <SelectContent>
                  {drivers?.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAddLeg(false)}>Cancel</Button>
            <Button onClick={handleAddLeg} disabled={isSubmitting || !newOrigin || !newDestination || !newDriverId}>
              {isSubmitting ? <SpinnerEllipsis /> : "Create Leg"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Modal */}
      <Dialog open={openReassign} onOpenChange={setOpenReassign}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Driver</DialogTitle>
            <DialogDescription>Assign a different driver for this trip leg. The current driver's history will be preserved as "Reassigned".</DialogDescription>
          </DialogHeader>
          {error && <div className="text-destructive text-sm font-medium">{error}</div>}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Driver</Label>
              <Select value={reassignDriverId} onValueChange={setReassignDriverId}>
                <SelectTrigger><SelectValue placeholder="Select new driver..." /></SelectTrigger>
                <SelectContent>
                  {drivers?.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.firstName} {d.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason for reassignment (Optional)</Label>
              <Textarea value={reassignNotes} onChange={(e) => setReassignNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReassign(false)}>Cancel</Button>
            <Button onClick={handleReassign} disabled={isSubmitting || !reassignDriverId}>
              {isSubmitting ? <SpinnerEllipsis /> : "Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
