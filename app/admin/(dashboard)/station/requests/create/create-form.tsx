"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SpinnerEllipsis from "@/components/spinner-ellipsis";

const CreateStationRequestSchema = z.object({
  stationId: z.string().min(1, "Station is required"),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  requestedLiters: z.coerce.number().positive("Must be a positive number"),
  notes: z.string().optional().nullable(),
});

export function CreateStationRequestForm({
  stations,
}: {
  stations: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof CreateStationRequestSchema>>({
    resolver: zodResolver(CreateStationRequestSchema) as any,
    defaultValues: {
      stationId: stations.length === 1 ? stations[0].id : "",
      productType: "PMS",
      requestedLiters: 0,
      notes: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof CreateStationRequestSchema>) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/station-requests", values);
    if (res.error) {
      setApiError(res.error.message);
      toast.error(res.error.message);
    } else {
      toast.success("Fuel request submitted successfully.");
      router.push("/admin/station/requests");
      router.refresh();
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="bg-card p-6 rounded-xl border shadow-sm space-y-6">
        {apiError && <p className="text-sm text-red-600 font-medium">{apiError}</p>}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className={form.formState.errors.stationId ? "text-destructive" : ""}>Station *</Label>
            <Controller
              control={form.control}
              name="stationId"
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value || undefined} disabled={stations.length === 1}>
                  <SelectTrigger className={form.formState.errors.stationId ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select Station" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.stationId && (
              <p className="text-xs text-destructive">{form.formState.errors.stationId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className={form.formState.errors.productType ? "text-destructive" : ""}>Product Type *</Label>
              <Controller
                control={form.control}
                name="productType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <SelectTrigger className={form.formState.errors.productType ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select Product" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PMS">PMS (Petrol)</SelectItem>
                      <SelectItem value="AGO">AGO (Diesel)</SelectItem>
                      <SelectItem value="DPK">DPK (Kerosene)</SelectItem>
                      <SelectItem value="LPG">LPG (Gas)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label className={form.formState.errors.requestedLiters ? "text-destructive" : ""}>Requested Liters *</Label>
              <Input
                type="number"
                placeholder="e.g. 15000"
                {...form.register("requestedLiters")}
                className={form.formState.errors.requestedLiters ? "border-destructive" : ""}
              />
              {form.formState.errors.requestedLiters && (
                <p className="text-xs text-destructive">{form.formState.errors.requestedLiters.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Any specific requests or timing constraints?"
              {...form.register("notes")}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/station/requests")}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <SpinnerEllipsis /> : "Submit Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
