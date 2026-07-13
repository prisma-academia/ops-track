"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Save, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/client/api";

export default function OutgoingPaymentForm() {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [category, setCategory] = useState<"PERSONAL_EXPENSE" | "FLEET_EXPENSE" | "TRANSPORT_FEE">("PERSONAL_EXPENSE");
  const [transportOpen, setTransportOpen] = useState(false);
  const [transporterOpen, setTransporterOpen] = useState(false);
  const [truckOpen, setTruckOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    description: "",
    paymentMethod: "Bank Transfer",
    reference: "",
    receiptUrl: "",
    transporterId: "",
    truckId: "",
    orderId: "",
    transportId: "",
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tenant/fleet/payments/metadata`);
        if (res.ok) {
          const data = await res.json();
          setMetadata(data.data || data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  // Handle derived transport fee calc
  useEffect(() => {
    if (category === "TRANSPORT_FEE" && formData.transportId && metadata?.transports) {
      const transport = metadata.transports.find((t: any) => t.id === formData.transportId);
      if (transport) {
        const base = Number(transport.ratePerLiter || 0) * Number(transport.litersDelivered || 0);
        const deductions = Number(transport.totalDeduction || 0) + Number(transport.maintenanceCost || 0);
        const suggestedAmount = Math.max(0, base - deductions);
        setFormData(prev => ({ ...prev, amount: suggestedAmount.toString(), transporterId: transport.transporterId }));
      }
    }
  }, [category, formData.transportId, metadata]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let endpoint = `/api/tenant/fleet/payments/outflow/expense`;
      let payload: any = {
        amount: Number(formData.amount),
        description: formData.description,
        paymentMethod: formData.paymentMethod,
        reference: formData.reference,
        receiptUrl: formData.receiptUrl,
      };

      if (category === "PERSONAL_EXPENSE") {
        payload.expenseType = "PERSONAL";
      } else if (category === "FLEET_EXPENSE") {
        payload.expenseType = "FLEET";
        payload.transporterId = formData.transporterId;
        payload.truckId = formData.truckId;
        payload.orderId = formData.orderId;
      } else if (category === "TRANSPORT_FEE") {
        endpoint = `/api/tenant/fleet/payments/outflow/transport`;
        payload = {
          transportId: formData.transportId,
          transporterId: formData.transporterId,
          amount: Number(formData.amount),
          paymentMethod: formData.paymentMethod,
          reference: formData.reference,
          receiptUrl: formData.receiptUrl,
          description: formData.description,
        };
      }

      const res = await apiPost<any>(endpoint, payload);

      if (!res.error) {
        toast.success("Payment recorded successfully!");
        setFormData({ ...formData, amount: "", description: "", reference: "", receiptUrl: "" });
      } else {
        toast.error(res.error?.message || "Failed to record payment.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error recording payment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><SpinnerEllipsis /></div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2 md:col-span-2">
          <Label>Expense Category</Label>
          <Select 
            value={category} 
            onValueChange={(val) => setCategory(val as any)}
          >
            <SelectTrigger className="bg-muted/50 border-primary/20 font-medium w-full">
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="PERSONAL_EXPENSE">Personal / Administrative Expenses</SelectItem>
              <SelectItem value="FLEET_EXPENSE">Fleet-Related Expenses</SelectItem>
              <SelectItem value="TRANSPORT_FEE">Transport Fee Payment</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {category === "TRANSPORT_FEE" && (
          <div className="space-y-2 flex flex-col justify-end">
            <Label>Select Transport Trip *</Label>
            <Popover open={transportOpen} onOpenChange={setTransportOpen}>
              <PopoverTrigger asChild className="w-full">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={transportOpen}
                  className="w-full justify-between font-normal"
                >
                  {formData.transportId
                    ? (() => {
                        const t = metadata?.transports?.find((t: any) => t.id === formData.transportId);
                        return t ? `${t.id.substring(0,8)} - ${t.destination}` : "Select Transport Trip...";
                      })()
                    : "Select Transport Trip..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search transport..." />
                  <CommandList>
                    <CommandEmpty>No transports found.</CommandEmpty>
                    <CommandGroup>
                      {metadata?.transports?.map((t: any) => (
                        <CommandItem
                          key={t.id}
                          value={`${t.id} ${t.destination}`}
                          onSelect={() => {
                            setFormData({ ...formData, transportId: t.id });
                            setTransportOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", formData.transportId === t.id ? "opacity-100" : "opacity-0")} />
                          {t.id.substring(0,8)} - {t.destination}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {(category === "FLEET_EXPENSE" || category === "TRANSPORT_FEE") && (
          <div className="space-y-2 flex flex-col justify-end">
            <Label>Transporter {category === "TRANSPORT_FEE" ? "*" : ""}</Label>
            <Popover open={transporterOpen} onOpenChange={setTransporterOpen}>
              <PopoverTrigger asChild className="w-full">
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={transporterOpen}
                  className="w-full justify-between font-normal"
                >
                  {formData.transporterId
                    ? metadata?.transporters?.find((t: any) => t.id === formData.transporterId)?.name
                    : "Select Transporter..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search transporter..." />
                  <CommandList>
                    <CommandEmpty>No transporters found.</CommandEmpty>
                    <CommandGroup>
                      {metadata?.transporters?.map((t: any) => (
                        <CommandItem
                          key={t.id}
                          value={t.name}
                          onSelect={() => {
                            setFormData({ ...formData, transporterId: t.id });
                            setTransporterOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", formData.transporterId === t.id ? "opacity-100" : "opacity-0")} />
                          {t.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {category === "FLEET_EXPENSE" && (
          <>
            <div className="space-y-2 flex flex-col justify-end">
              <Label>Truck (Optional)</Label>
              <Popover open={truckOpen} onOpenChange={setTruckOpen}>
                <PopoverTrigger asChild className="w-full">
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={truckOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.truckId
                      ? (() => {
                          const t = metadata?.trucks?.find((t: any) => t.id === formData.truckId);
                          return t ? `${t.name} - ${t.truckNumber}` : "Select Truck...";
                        })()
                      : "Select Truck..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search truck..." />
                    <CommandList>
                      <CommandEmpty>No trucks found.</CommandEmpty>
                      <CommandGroup>
                        {metadata?.trucks?.map((t: any) => (
                          <CommandItem
                            key={t.id}
                            value={`${t.name} ${t.truckNumber}`}
                            onSelect={() => {
                              setFormData({ ...formData, truckId: t.id });
                              setTruckOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.truckId === t.id ? "opacity-100" : "opacity-0")} />
                            {t.name} - {t.truckNumber}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <Label>Order (Optional)</Label>
              <Popover open={orderOpen} onOpenChange={setOrderOpen}>
                <PopoverTrigger asChild className="w-full">
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={orderOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.orderId
                      ? (() => {
                          const o = metadata?.orders?.find((o: any) => o.id === formData.orderId);
                          return o ? (o.reference || o.id.substring(0,8)) : "Select Order...";
                        })()
                      : "Select Order..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search order..." />
                    <CommandList>
                      <CommandEmpty>No orders found.</CommandEmpty>
                      <CommandGroup>
                        {metadata?.orders?.map((o: any) => (
                          <CommandItem
                            key={o.id}
                            value={o.reference || o.id}
                            onSelect={() => {
                              setFormData({ ...formData, orderId: o.id });
                              setOrderOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", formData.orderId === o.id ? "opacity-100" : "opacity-0")} />
                            {o.reference || o.id.substring(0,8)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label>Amount Paid (₦) *</Label>
          <Input 
            required
            type="number"
            min="0"
            step="0.01"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="e.g. 50000"
          />
          {category === "TRANSPORT_FEE" && (
            <p className="text-xs text-muted-foreground mt-1">Amount is auto-calculated based on deductions, but can be edited.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Payment Method *</Label>
          <Select 
            value={formData.paymentMethod} 
            onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Payment Method" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Transaction Reference</Label>
          <Input 
            type="text"
            value={formData.reference}
            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
            placeholder="e.g. TXN-12345 (Optional)"
          />
        </div>

        <div className="space-y-2">
          <Label>Attach Proof (Cloudinary URL)</Label>
          <Input 
            type="text"
            placeholder="https://res.cloudinary.com/..."
            value={formData.receiptUrl}
            onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Description / Purpose {category !== "TRANSPORT_FEE" ? "*" : ""}</Label>
          <Textarea 
            required={category !== "TRANSPORT_FEE"}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="What is this payment for?"
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/30">
        <Button 
          type="submit" 
          disabled={submitting}
          className="h-10 rounded-full px-6 gap-2 bg-red-600 hover:bg-red-700 text-white"
        >
          {submitting ? (
            <>
              <SpinnerEllipsis />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Log Payment</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
