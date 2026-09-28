"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client/api";
import { Card } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField, TextInput } from "@/components/form-field";
import {
  Building2,
  Car,
  Fuel,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  CreditCard,
  MapPin,
  ArrowRight,
  Printer,
} from "lucide-react";

interface StationOption {
  id: string;
  name: string;
  code: string;
  location: string | null;
  state: string | null;
  prices: Array<{ productType: string; price: number }>;
}

export function ClientDispenseTerminal({ stations }: { stations: StationOption[] }) {
  const router = useRouter();
  const [selectedStationId, setSelectedStationId] = useState<string>(stations[0]?.id || "");
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  // Dispense Form State
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [liters, setLiters] = useState<string>("");
  const [pricePerLiter, setPricePerLiter] = useState<string>("");
  const [odometerReading, setOdometerReading] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);

  const activeStation = stations.find((s) => s.id === selectedStationId);

  // Auto-fill price when match is selected
  useEffect(() => {
    if (selectedMatch && activeStation) {
      const fuelType = selectedMatch.vehicle.fuelType;
      const priceObj = activeStation.prices.find((p) => p.productType === fuelType);
      if (priceObj) {
        setPricePerLiter(String(priceObj.price));
      } else {
        setPricePerLiter("750"); // Fallback
      }

      if (selectedMatch.client.drivers?.length > 0) {
        setSelectedDriverId(selectedMatch.client.drivers[0].id);
      }
    }
  }, [selectedMatch, activeStation]);

  // Handle Lookup
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || !selectedStationId) return;

    setIsSearching(true);
    setError(null);
    setSelectedMatch(null);

    const res = await apiGet<{ matches: any[] }>(
      `/api/tenant/clients/dispense/lookup?stationId=${selectedStationId}&query=${encodeURIComponent(query)}`
    );
    setIsSearching(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setMatches(res.data?.matches || []);
    if ((res.data?.matches || []).length === 1) {
      setSelectedMatch(res.data!.matches[0]);
    }
  };

  // Calculations
  const numLiters = Number(liters) || 0;
  const numPrice = Number(pricePerLiter) || 0;
  const totalAmount = Number((numLiters * numPrice).toFixed(2));

  // Max volume validation check
  const tankCapacity = selectedMatch?.vehicle?.tankCapacity || 0;
  const isOverCapacity = numLiters > tankCapacity && tankCapacity > 0;

  // Solvency check
  const availableHeadroom = selectedMatch?.client?.availableHeadroom || 0;
  const isInsufficientFunds = totalAmount > availableHeadroom;

  // Handle Dispense Submission
  const handleExecuteDispense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !selectedDriverId) {
      setError("Please select a valid driver.");
      return;
    }

    if (numLiters <= 0) {
      setError("Liters dispensed must be greater than zero.");
      return;
    }

    if (isOverCapacity) {
      setError(`Cannot dispense ${numLiters}L: exceeds vehicle tank capacity of ${tankCapacity}L.`);
      return;
    }

    if (isInsufficientFunds) {
      setError(`Insufficient client funds/credit limit: Required ₦${totalAmount.toLocaleString()}, Available ₦${availableHeadroom.toLocaleString()}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload = {
      stationId: selectedStationId,
      clientId: selectedMatch.client.id,
      vehicleId: selectedMatch.vehicle.id,
      driverId: selectedDriverId,
      productType: selectedMatch.vehicle.fuelType,
      liters: numLiters,
      pricePerLiter: numPrice,
      odometerReading: odometerReading ? Number(odometerReading) : null,
      notes: notes || null,
    };

    const res = await apiPost<{ order: any; billingModel: string; newBalance: number }>(
      "/api/tenant/clients/dispense",
      payload
    );
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    // Set Receipt
    setSuccessReceipt({
      order: res.data?.order,
      billingModel: res.data?.billingModel,
      newBalance: res.data?.newBalance,
      clientName: selectedMatch.client.companyName,
      plateNumber: selectedMatch.vehicle.plateNumber,
      stationName: activeStation?.name,
      totalAmount,
      liters: numLiters,
      productType: selectedMatch.vehicle.fuelType,
      timestamp: new Date().toLocaleString(),
    });

    // Reset Form
    setSelectedMatch(null);
    setMatches([]);
    setQuery("");
    setLiters("");
    setOdometerReading("");
    setNotes("");
  };

  return (
    <div className="space-y-6">
      {/* 1. Branch Selector Card */}
      <Card className="p-4 bg-muted/20 border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary shrink-0" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Operating Station Branch
              </div>
              <div className="text-sm font-bold text-foreground">
                {activeStation ? `${activeStation.name} (${activeStation.code})` : "Select Station"}
              </div>
            </div>
          </div>

          <div className="sm:w-64">
            <select
              value={selectedStationId}
              onChange={(e) => {
                setSelectedStationId(e.target.value);
                setSelectedMatch(null);
                setMatches([]);
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* 2. Vehicle / Driver Lookup Bar */}
      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Vehicle & Driver Verification</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Type the vehicle plate number (e.g. ABC-123) to verify corporate authorization at this station.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Enter Vehicle Plate Number (e.g. ABC-123)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-input bg-background text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button type="submit" disabled={isSearching || !query.trim()} className="h-10">
            {isSearching ? "Verifying…" : "Look Up"}
          </Button>
        </form>

        {/* Search Results list if multiple */}
        {matches.length > 1 && !selectedMatch && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-xs font-semibold text-muted-foreground">Select Matching Fleet Vehicle:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {matches.map((m) => (
                <div
                  key={m.vehicle.id}
                  onClick={() => setSelectedMatch(m)}
                  className="p-3 rounded-lg border border-border hover:border-primary cursor-pointer transition-all bg-card flex justify-between items-center"
                >
                  <div>
                    <div className="font-mono font-bold text-sm text-foreground">{m.vehicle.plateNumber}</div>
                    <div className="text-xs text-muted-foreground">{m.client.companyName}</div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    {m.vehicle.fuelType}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 && !isSearching && query.trim() !== "" && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">No authorized vehicle found</div>
              <div>
                Either this vehicle is not registered, or its parent client organization is not permitted to lift fuel at this station branch.
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Verified Authorization & Dispense Card */}
      {selectedMatch && (
        <Card className="p-6 space-y-6 border-primary/40 shadow-md">
          {/* Verified Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-foreground font-mono">{selectedMatch.vehicle.plateNumber}</h3>
                  <Badge variant="outline" className="text-xs font-mono font-bold text-primary">
                    {selectedMatch.vehicle.fuelType}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Building2 className="size-3 text-muted-foreground" />
                  {selectedMatch.client.companyName}
                </div>
              </div>
            </div>

            <div className="text-right">
              <Badge
                variant={selectedMatch.client.billingModel === "PREPAID" ? "default" : "secondary"}
                className={
                  selectedMatch.client.billingModel === "PREPAID"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
                }
              >
                {selectedMatch.client.billingModel}
              </Badge>
              <div className="text-xs font-mono font-bold text-foreground mt-1">
                Headroom: ₦{selectedMatch.client.availableHeadroom.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Vehicle Specs Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/30 border text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Make / Model</span>
              <span className="font-medium">{selectedMatch.vehicle.makeModel || "Not specified"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Tank Max Capacity</span>
              <span className="font-mono font-bold text-foreground">{tankCapacity} Liters</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Daily Limit</span>
              <span className="font-mono">{selectedMatch.vehicle.dailyLimitLiters ? `${selectedMatch.vehicle.dailyLimitLiters} L` : "Unlimited"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase">Branch Authorization</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Validated
              </span>
            </div>
          </div>

          {/* Dispense Form */}
          <form onSubmit={handleExecuteDispense} className="space-y-4 text-xs">
            {/* Driver Selector */}
            <FormField label="Assigned Driver" htmlFor="driverSelect" required>
              {selectedMatch.client.drivers?.length === 0 ? (
                <p className="text-rose-600 text-xs">No active drivers registered under this client. Register a driver in the client profile first.</p>
              ) : (
                <select
                  id="driverSelect"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  {selectedMatch.client.drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.phone}) {d.licenseNumber ? `• Lic: ${d.licenseNumber}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </FormField>

            {/* Liters & Unit Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Liters Dispensed"
                htmlFor="liters"
                description={`Max tank capacity: ${tankCapacity}L`}
                required
              >
                <TextInput
                  id="liters"
                  type="number"
                  step="0.1"
                  min="0.5"
                  max={tankCapacity}
                  placeholder="e.g. 50"
                  value={liters}
                  onChange={(e) => setLiters(e.target.value)}
                  className="text-base font-mono font-bold"
                  required
                />
              </FormField>

              <FormField
                label="Pump Price per Liter (₦)"
                htmlFor="pricePerLiter"
                description="Current branch pump price"
                required
              >
                <TextInput
                  id="pricePerLiter"
                  type="number"
                  step="0.01"
                  min="1"
                  value={pricePerLiter}
                  onChange={(e) => setPricePerLiter(e.target.value)}
                  className="text-base font-mono"
                  required
                />
              </FormField>
            </div>

            {/* Odometer & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Odometer Reading (KM, Optional)" htmlFor="odometer">
                <TextInput
                  id="odometer"
                  type="number"
                  placeholder="e.g. 124500"
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                />
              </FormField>

              <FormField label="Manager Operational Notes (Optional)" htmlFor="dispenseNotes">
                <TextInput
                  id="dispenseNotes"
                  placeholder="Pump number / Nozzle / Attendant on pump"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>
            </div>

            {/* Live Financial Calculation Box */}
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-semibold text-muted-foreground">Total Sale Amount</span>
                <div className="text-2xl font-bold font-mono text-primary">
                  ₦{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="text-right text-xs">
                <span className="text-muted-foreground block">
                  {selectedMatch.client.billingModel === "PREPAID" ? "Deducted from Deposit" : "Charged to Account Debt"}
                </span>
                <span className="font-semibold text-foreground">
                  Remaining Headroom: ₦{Math.max(0, availableHeadroom - totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {isOverCapacity && (
              <p className="text-rose-600 text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200">
                Warning: Requested {numLiters}L exceeds the maximum vehicle tank capacity of {tankCapacity}L.
              </p>
            )}

            {isInsufficientFunds && (
              <p className="text-rose-600 text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200">
                Insufficient client funds. Available headroom is ₦{availableHeadroom.toLocaleString()}, but order requires ₦{totalAmount.toLocaleString()}.
              </p>
            )}

            {error && (
              <p className="text-rose-600 text-xs font-semibold bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setSelectedMatch(null)}>
                Clear
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isOverCapacity || isInsufficientFunds || numLiters <= 0}
                className="gap-2"
              >
                {isSubmitting ? "Authorizing Dispense…" : "Authorize & Sign Off Dispense"}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 4. SUCCESS RECEIPT MODAL */}
      {successReceipt && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="size-7" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Fuel Dispense Authorized</h3>
              <p className="text-xs text-muted-foreground">Transaction recorded to corporate account ledger</p>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-2 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Client Organization</span>
                <span className="font-semibold text-foreground">{successReceipt.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle Plate</span>
                <span className="font-mono font-bold text-foreground">{successReceipt.plateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Volume & Product</span>
                <span className="font-mono font-bold text-foreground">
                  {successReceipt.liters} Liters {successReceipt.productType}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Station Branch</span>
                <span className="font-medium text-foreground">{successReceipt.stationName}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total Sale Value</span>
                <span className="font-mono font-bold text-primary text-sm">
                  ₦{successReceipt.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[11px]">
                <span>Updated Client Balance</span>
                <span className="font-mono font-semibold text-foreground">
                  ₦{Number(successReceipt.newBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-1.5"
                onClick={() => window.print()}
              >
                <Printer className="size-4" />
                Print Receipt
              </Button>
              <Button
                className="flex-1"
                onClick={() => setSuccessReceipt(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
