"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Save } from "lucide-react";

export default function IncomingPaymentForm() {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    customerId: "",
    saleId: "",
    amount: "",
    paymentType: "FULL_SETTLEMENT",
    paymentMethod: "Bank Transfer",
    reference: "",
    receiptUrl: "",
  });

  useEffect(() => {
    const fetchMetadata = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tenant/fleet/payments/metadata`);
        if (res.ok) {
          const data = await res.json();
          setMetadata(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tenant/fleet/payments/inflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
        }),
      });
      if (res.ok) {
        toast.success("Payment recorded successfully!");
        setFormData({ ...formData, amount: "", reference: "", receiptUrl: "" });
      } else {
        toast.error("Failed to record payment.");
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
        <div className="space-y-2">
          <Label>Client Name *</Label>
          <Select 
            value={formData.customerId} 
            onValueChange={(val) => setFormData({ ...formData, customerId: val })}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Client" />
            </SelectTrigger>
            <SelectContent position="popper">
              {metadata?.customers?.length > 0 ? (
                metadata.customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>No clients found</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Sales ID / Order Reference</Label>
          <Input 
            type="text"
            value={formData.saleId}
            onChange={(e) => setFormData({ ...formData, saleId: e.target.value })}
            placeholder="Enter Sale ID (Optional)"
          />
        </div>

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
        </div>

        <div className="space-y-2">
          <Label>Payment Type *</Label>
          <Select 
            value={formData.paymentType} 
            onValueChange={(val) => setFormData({ ...formData, paymentType: val })}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Payment Type" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="ADVANCE_DEPOSIT">Advance Deposit</SelectItem>
              <SelectItem value="PART_PAYMENT">Part Payment</SelectItem>
              <SelectItem value="FULL_SETTLEMENT">Full Settlement</SelectItem>
              <SelectItem value="DEBT_CLEARANCE">Debt Clearance</SelectItem>
            </SelectContent>
          </Select>
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

        <div className="space-y-2 md:col-span-2">
          <Label>Attach Proof (Cloudinary URL)</Label>
          <Input 
            type="text"
            placeholder="https://res.cloudinary.com/..."
            value={formData.receiptUrl}
            onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">Upload proof to Cloudinary and paste URL here.</p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/30">
        <Button 
          type="submit" 
          disabled={submitting}
          className="h-10 rounded-full px-6 gap-2"
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
