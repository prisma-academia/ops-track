"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormattedNumberInput } from "@/components/ui/formatted-number-input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { toast } from "sonner";
import { apiPost } from "@/lib/client/api";
import { Building2, Info, Check, ChevronsUpDown } from "lucide-react";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo",
  "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa",
  "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const Schema = z.object({
  transporterId: z.string().min(1, "Transporter is required"),
  destination: z.string().min(1, "Destination is required"),
  litersRequested: z.coerce.number().positive("Must be greater than 0"),
  message: z.string().optional().nullable(),
});

type Values = z.infer<typeof Schema>;

interface Props {
  orderId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  maxLiters: number;
  sourceDepotName?: string;
  invitations?: any[];
}

export function TransportInvitationModal({ orderId, isOpen, onOpenChange, maxLiters, sourceDepotName, invitations = [] }: Props) {
  const router = useRouter();
  
  const [transporters, setTransporters] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [openDestination, setOpenDestination] = useState(false);

  const { register, handleSubmit, formState, reset, control, watch } = useForm<Values>({
    resolver: zodResolver(Schema) as any,
    defaultValues: {
      litersRequested: maxLiters,
      message: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ litersRequested: maxLiters > 0 ? maxLiters : 0, message: "" });
      
      const fetchLookups = async () => {
        setLoadingLookups(true);
        try {
          const [waybillRes, stationRes] = await Promise.all([
            fetch("/api/tenant/waybills/lookups"),
            fetch("/api/tenant/stations")
          ]);
          
          if (waybillRes.ok) {
            const data = await waybillRes.json();
            setTransporters(data.transportCompanies || []);
          }
          if (stationRes.ok) {
            const data = await stationRes.json();
            setStations(data.data || []);
          }
        } catch (e) {
          console.error("Failed to load lookups", e);
        } finally {
          setLoadingLookups(false);
        }
      };
      
      fetchLookups();
    }
  }, [isOpen, maxLiters, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await apiPost(`/api/tenant/fleet/orders/${orderId}/invitations`, values);
      if (res.error) {
        toast.error(res.error.message);
        return;
      }
      toast.success("Invitation sent successfully");
      onOpenChange(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to send invitation");
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={invitations.length > 0 ? "sm:max-w-[900px] p-0 overflow-hidden" : "sm:max-w-[500px] p-0 overflow-hidden"}>
        <div className={invitations.length > 0 ? "grid md:grid-cols-2 divide-x" : ""}>
          <form onSubmit={onSubmit} className="flex flex-col bg-card h-full max-h-[85vh]">
            <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle>Send Transport Invitation</DialogTitle>
            <DialogDescription>
              Assign or invite a company to provide transport for this order.
            </DialogDescription>
          </DialogHeader>
          
          {loadingLookups ? (
            <div className="py-12 flex justify-center"><SpinnerEllipsis /></div>
          ) : (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-1 space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-700/80 font-medium flex items-center gap-1.5"><Building2 className="w-4 h-4"/> Pickup Location (Origin)</span>
                  {sourceDepotName ? (
                    <span className="font-semibold text-blue-900">{sourceDepotName}</span>
                  ) : (
                    <span className="text-amber-600 font-semibold text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      Not set — Please "Edit Order" to add depot
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transporterId">Transporter (Company) *</Label>
                <Controller
                  control={control}
                  name="transporterId"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <SelectTrigger className={formState.errors.transporterId ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select Transporter" />
                      </SelectTrigger>
                      <SelectContent>
                        {transporters.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {formState.errors.transporterId && <p className="text-xs text-destructive">{formState.errors.transporterId.message}</p>}
              </div>


              <div className="space-y-2">
                <Label>Volume (Liters) *</Label>
                <Controller
                  control={control}
                  name="litersRequested"
                  render={({ field }) => (
                    <FormattedNumberInput 
                      placeholder="Volume" 
                      {...field}
                      className={formState.errors.litersRequested ? "border-destructive" : ""}
                    />
                  )}
                />
                {formState.errors.litersRequested && <p className="text-xs text-destructive">{formState.errors.litersRequested.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Primary Destination *</Label>
                <Controller
                  control={control}
                  name="destination"
                  render={({ field }) => (
                    <Popover open={openDestination} onOpenChange={setOpenDestination}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" className={`w-full justify-between font-normal ${formState.errors.destination ? "border-destructive" : ""}`}>
                          <span className="truncate">{field.value || "Search state or station..."}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search destination..." />
                          <CommandList className="max-h-[200px] overflow-y-auto">
                            <CommandEmpty>No destination found.</CommandEmpty>
                            
                            {stations.length > 0 && (
                              <CommandGroup heading="Stations">
                                {stations.map((s) => (
                                  <CommandItem key={s.id} value={s.name.toLowerCase()} onSelect={() => { 
                                    field.onChange(s.name); 
                                    setOpenDestination(false); 
                                  }}>
                                    <div className="flex flex-col">
                                      <span>{s.name}</span>
                                      <span className="text-[10px] text-muted-foreground">{s.location || s.state}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}

                            <CommandGroup heading="States">
                              {NIGERIAN_STATES.map((state) => (
                                <CommandItem key={state} value={state.toLowerCase()} onSelect={() => { 
                                  field.onChange(state); 
                                  setOpenDestination(false); 
                                }}>
                                  {state}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {formState.errors.destination && <p className="text-xs text-destructive">{formState.errors.destination.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Message / Instructions (Optional)</Label>
                <Textarea {...register("message")} placeholder="Add any specific instructions for the transporter..." rows={3} />
              </div>
            </div>
          )}
          
          <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={formState.isSubmitting || loadingLookups}>
              {formState.isSubmitting ? <SpinnerEllipsis /> : "Send Invitation"}
            </Button>
          </DialogFooter>
        </form>

        {invitations.length > 0 && (
          <div className="bg-muted/10 p-6 overflow-y-auto max-h-[85vh] flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">Sent Invitations</h4>
              <Badge variant="secondary">{invitations.length}</Badge>
            </div>
            <div className="space-y-3 flex-1">
              {invitations.map((inv: any) => (
                <div key={inv.id} className="p-4 border rounded-xl bg-white dark:bg-stone-950 shadow-sm flex flex-col gap-3 transition-colors hover:border-primary/30">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      {inv.transporter?.name || "Unknown Transporter"} 
                    </span>
                    <Badge variant="outline" className={
                      inv.status === "PENDING" ? "text-amber-600 bg-amber-50 border-amber-200" : 
                      inv.status === "ACCEPTED" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-stone-500 border-stone-200 bg-stone-50"
                    }>{inv.status}</Badge>
                  </div>
                  <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground font-medium mb-0.5">Volume</p>
                      <p className="font-semibold">{Number(inv.litersRequested).toLocaleString()} L</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground font-medium mb-0.5">Destination</p>
                      <p className="font-semibold truncate" title={inv.destination}>{inv.destination}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
