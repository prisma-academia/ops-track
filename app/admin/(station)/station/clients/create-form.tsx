"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Building2, CreditCard, ShieldCheck, MapPin, Check } from "lucide-react";

interface StationOption {
  id: string;
  name: string;
  code: string;
  location: string | null;
  state: string | null;
}

const Schema = z.object({
  companyName: z.string().min(2, "Company/Organization name is required").max(200),
  email: z.string().email("Valid corporate email is required"),
  rcNumber: z.string().max(50).optional(),
  contactPerson: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  address: z.string().max(300).optional(),
  billingModel: z.enum(["PREPAID", "POSTPAID"]),
  creditLimit: z.coerce.number().min(0).default(0),
  billingCycleDays: z.coerce.number().min(1).max(365).default(30),
  approvalRequirement: z.enum(["MANAGER_ONLY", "CLIENT_ADMIN_ALWAYS"]).default("MANAGER_ONLY"),
  dailyMaxLiters: z.coerce.number().positive().optional().nullable(),
});

type Values = z.infer<typeof Schema>;

export function CreateClientForm({ stations }: { stations: StationOption[] }) {
  const router = useRouter();
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>(
    stations.map((s) => s.id) // Default: all stations selected
  );
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState } = useForm<Values>({
    resolver: zodResolver(Schema) as any,
    defaultValues: {
      billingModel: "PREPAID",
      creditLimit: 0,
      billingCycleDays: 30,
      approvalRequirement: "MANAGER_ONLY",
    },
  });

  const billingModel = watch("billingModel");

  const toggleStation = (id: string) => {
    setSelectedStationIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const toggleAllStations = () => {
    if (selectedStationIds.length === stations.length) {
      setSelectedStationIds([]);
    } else {
      setSelectedStationIds(stations.map((s) => s.id));
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    if (selectedStationIds.length === 0) {
      setError("Please select at least one station branch where this client can lift fuel.");
      return;
    }

    const payload = {
      ...values,
      allowedStationIds: selectedStationIds,
    };

    const res = await apiPost<{ client: { id: string } }>("/api/tenant/clients", payload);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    if (res.data?.client?.id) {
      router.push(`/admin/station/clients/${res.data.client.id}`);
    } else {
      router.push("/admin/station/clients");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* 1. Organization Details */}
      <div>
        <div className="flex items-center gap-2 pb-2 mb-4 border-b border-border">
          <Building2 className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Organization Profile</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Company / Agency Name" htmlFor="companyName" error={formState.errors.companyName?.message} required>
            <TextInput id="companyName" placeholder="e.g. Dangote Logistics Ltd / Federal Ministry" {...register("companyName")} />
          </FormField>

          <FormField label="Corporate Email Address" htmlFor="email" error={formState.errors.email?.message} required>
            <TextInput id="email" type="email" placeholder="admin@organization.com" {...register("email")} />
          </FormField>

          <FormField label="RC / Registration Number (Optional)" htmlFor="rcNumber" error={formState.errors.rcNumber?.message}>
            <TextInput id="rcNumber" placeholder="RC-1234567" {...register("rcNumber")} />
          </FormField>

          <FormField label="Primary Contact Person" htmlFor="contactPerson" error={formState.errors.contactPerson?.message}>
            <TextInput id="contactPerson" placeholder="Full name of Fleet Manager" {...register("contactPerson")} />
          </FormField>

          <FormField label="Contact Phone Number" htmlFor="phone" error={formState.errors.phone?.message}>
            <TextInput id="phone" placeholder="+234 801 234 5678" {...register("phone")} />
          </FormField>

          <FormField label="Physical / Billing Address" htmlFor="address" error={formState.errors.address?.message}>
            <TextInput id="address" placeholder="Headquarters or Operating Base" {...register("address")} />
          </FormField>
        </div>
      </div>

      {/* 2. Billing & Financial Model */}
      <div>
        <div className="flex items-center gap-2 pb-2 mb-4 border-b border-border">
          <CreditCard className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Billing & Payment Terms</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Account Model
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValue("billingModel", "PREPAID")}
                className={`p-3 text-left border rounded-lg transition-all ${
                  billingModel === "PREPAID"
                    ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary"
                    : "border-border hover:border-primary/50 text-muted-foreground"
                }`}
              >
                <div className="font-semibold text-sm">Prepaid Deposit Wallet</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Client tops up deposit via Paystack. Fuel is deducted at pump rate.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setValue("billingModel", "POSTPAID")}
                className={`p-3 text-left border rounded-lg transition-all ${
                  billingModel === "POSTPAID"
                    ? "border-indigo-500 bg-indigo-50/20 text-foreground ring-1 ring-indigo-500"
                    : "border-border hover:border-indigo-500/50 text-muted-foreground"
                }`}
              >
                <div className="font-semibold text-sm">Postpaid Credit (Debt)</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Client collects fuel on approved credit limit and settles periodically via Paystack.
                </div>
              </button>
            </div>
          </div>

          {billingModel === "POSTPAID" && (
            <>
              <FormField
                label="Credit Limit (₦)"
                htmlFor="creditLimit"
                error={formState.errors.creditLimit?.message}
                description="Maximum allowable unpaid fuel charges before dispensing is blocked."
              >
                <TextInput id="creditLimit" type="number" step="1000" min="0" placeholder="5000000" {...register("creditLimit")} />
              </FormField>

              <FormField
                label="Billing Cycle (Days)"
                htmlFor="billingCycleDays"
                error={formState.errors.billingCycleDays?.message}
                description="Frequency for periodic statement generation (e.g. 30 days)."
              >
                <TextInput id="billingCycleDays" type="number" min="1" max="365" {...register("billingCycleDays")} />
              </FormField>
            </>
          )}
        </div>
      </div>

      {/* 3. Station Branch Permission Filter */}
      <div>
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Permitted Station Branches</h3>
          </div>
          <button
            type="button"
            onClick={toggleAllStations}
            className="text-xs font-medium text-primary hover:underline"
          >
            {selectedStationIds.length === stations.length ? "Deselect All" : "Select All Branches"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Select which station branches this client’s drivers are authorized to collect fuel from.
        </p>

        {stations.length === 0 ? (
          <p className="text-xs text-amber-600">No stations registered under this tenant yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {stations.map((st) => {
              const isSelected = selectedStationIds.includes(st.id);
              return (
                <div
                  key={st.id}
                  onClick={() => toggleStation(st.id)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 text-foreground font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate font-semibold">{st.name}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{st.code} {st.state ? `• ${st.state}` : ""}</div>
                  </div>
                  <div
                    className={`size-4 rounded flex items-center justify-center shrink-0 border ${
                      isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                    }`}
                  >
                    {isSelected && <Check className="size-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Dispense Authorization Policy */}
      <div>
        <div className="flex items-center gap-2 pb-2 mb-4 border-b border-border">
          <ShieldCheck className="size-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Station Authorization Policy</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Approval Mode"
            htmlFor="approvalRequirement"
            description="Controls whether Station Manager signs off directly or requires client admin prompt."
          >
            <select
              id="approvalRequirement"
              {...register("approvalRequirement")}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="MANAGER_ONLY">Station Manager Verification Only (Recommended)</option>
              <option value="CLIENT_ADMIN_ALWAYS">Require Client Admin Real-time Approval</option>
            </select>
          </FormField>

          <FormField
            label="Fleet Daily Max Volume Limit (Liters, Optional)"
            htmlFor="dailyMaxLiters"
            description="Global ceiling on total fuel this client can collect across all branches per day."
          >
            <TextInput id="dailyMaxLiters" type="number" step="10" min="0" placeholder="Unlimited" {...register("dailyMaxLiters")} />
          </FormField>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900">{error}</p>}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={formState.isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "Creating Client Organization…" : "Register Client"}
        </Button>
      </div>
    </form>
  );
}
