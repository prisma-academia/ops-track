"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/client/api";
import { Building2, Loader2 } from "lucide-react";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "KES", "GHS"];
const DURATIONS = [
  { label: "1 month",  days: 30 },
  { label: "3 months", days: 91 },
  { label: "6 months", days: 182 },
  { label: "1 year",   days: 365 },
  { label: "Custom",   days: 0 },
];

type Tenant = { id: string; name: string; slug: string };

export default function RecordPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("tenantId") ?? "";

  const [tenantSearch, setTenantSearch] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searching, setSearching] = useState(false);

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [description, setDescription] = useState("");
  const [receiptRef, setReceiptRef] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationKey, setDurationKey] = useState(3); // index into DURATIONS
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Pre-load tenant from URL
  useEffect(() => {
    if (!preselectedId) return;
    apiGet<{ tenant: Tenant }>(`/api/platform/tenants/${preselectedId}`).then((res) => {
      if (res.data?.tenant) setSelectedTenant(res.data.tenant);
    });
  }, [preselectedId]);

  // Auto-calc end date
  useEffect(() => {
    const dur = DURATIONS[durationKey];
    if (!dur || dur.days === 0) return;
    const start = new Date(startDate);
    const end = new Date(start.getTime() + dur.days * 24 * 60 * 60 * 1000);
    setEndDate(end.toISOString().slice(0, 10));
  }, [startDate, durationKey]);

  async function search(q: string) {
    setTenantSearch(q);
    if (q.length < 2) { setTenants([]); return; }
    setSearching(true);
    const res = await apiGet<Tenant[]>(`/api/platform/tenants?search=${encodeURIComponent(q)}&take=8`);
    setSearching(false);
    setTenants(res.data ?? []);
  }

  async function submit() {
    if (!selectedTenant) return;
    setSubmitting(true);
    const res = await apiPost("/api/platform/subscriptions", {
      tenantId: selectedTenant.id,
      amount: parseFloat(amount),
      currency,
      description: description || undefined,
      receiptRef: receiptRef || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    });
    setSubmitting(false);
    if (res.error) { alert(res.error.message); return; }
    router.push(`/tenants/${selectedTenant.id}?tab=controls`);
  }

  const isCustomDuration = DURATIONS[durationKey]?.days === 0;
  const canSubmit = selectedTenant && amount && parseFloat(amount) > 0 && startDate && endDate && !submitting;

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Record Payment" backHref="/tenants" />

      {/* Step 1 — Select Tenant */}
      <Card>
        <CardHeader className="border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Step 1 — Select Tenant</CardTitle>
          </div>
          <CardDescription className="text-xs">Search for the tenant this deal is for.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {selectedTenant ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
              <div>
                <p className="font-medium text-sm">{selectedTenant.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{selectedTenant.slug}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setSelectedTenant(null); setTenantSearch(""); }}>
                Change
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                placeholder="Search by company name or slug…"
                value={tenantSearch}
                onChange={(e) => search(e.target.value)}
                className="pr-8"
              />
              {searching && <Loader2 className="absolute right-2.5 top-2.5 size-4 animate-spin text-muted-foreground" />}
              {tenants.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                  {tenants.map((t) => (
                    <button
                      key={t.id}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg"
                      onClick={() => { setSelectedTenant(t); setTenants([]); setTenantSearch(""); }}
                    >
                      <div>
                        <p className="text-sm font-medium">{t.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{t.slug}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Deal Details */}
      <Card>
        <CardHeader className="border-b border-border/40 pb-3">
          <CardTitle className="text-sm font-semibold">Step 2 — Deal Details</CardTitle>
          <CardDescription className="text-xs">Enter the payment and coverage details.</CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="amount" className="text-xs">Amount *</Label>
              <Input id="amount" type="number" min={0} step={0.01} placeholder="500000" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs">Currency *</Label>
              <select id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-xs">Start Date *</Label>
              <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duration *</Label>
              <select value={durationKey} onChange={(e) => setDurationKey(Number(e.target.value))} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                {DURATIONS.map((d, i) => <option key={i} value={i}>{d.label}</option>)}
              </select>
            </div>
          </div>

          {isCustomDuration && (
            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-xs">Custom End Date *</Label>
              <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} />
            </div>
          )}
          {!isCustomDuration && endDate && (
            <p className="text-xs text-muted-foreground">Coverage ends: <strong>{new Date(endDate).toLocaleDateString()}</strong></p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="receipt-ref" className="text-xs">Invoice / Receipt Reference</Label>
            <Input id="receipt-ref" placeholder="INV-2026-001" value={receiptRef} onChange={(e) => setReceiptRef(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Textarea id="description" placeholder="e.g. Annual license — 3 stations, fleet module" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="resize-none text-sm" />
          </div>
        </CardContent>
      </Card>

      {/* Confirm */}
      {selectedTenant && amount && endDate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <p className="text-sm font-medium">Summary</p>
            <p className="text-xs text-muted-foreground mt-1">
              Recording <strong>{currency} {parseFloat(amount).toLocaleString()}</strong> for <strong>{selectedTenant.name}</strong> from{" "}
              <strong>{new Date(startDate).toLocaleDateString()}</strong> to{" "}
              <strong>{new Date(endDate).toLocaleDateString()}</strong>.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button disabled={!canSubmit} onClick={submit} className="min-w-32">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : "Record Payment"}
        </Button>
      </div>
    </div>
  );
}