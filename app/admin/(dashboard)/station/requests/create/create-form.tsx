"use client";

import { useState } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
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
import { Plus, Trash2 } from "lucide-react";
import { StationStockSummary, StationStockData } from "@/components/station-stock-summary";

const CreateBatchRequestSchema = z.object({
  notes: z.string().optional().nullable(),
  requests: z.array(z.object({
    stationId: z.string().min(1, "Station is required"),
    productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
    requestedLiters: z.coerce.number().positive("Must be a positive number"),
  })).min(1, "At least one request is required"),
});

type FormValues = z.infer<typeof CreateBatchRequestSchema>;

export function CreateStationRequestForm({
  stations,
}: {
  stations: StationStockData[];
}) {
  const router = useRouter();
  const [apiError, setApiError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateBatchRequestSchema) as any,
    defaultValues: {
      notes: "",
      requests: [
        {
          stationId: stations.length === 1 ? stations[0].stationId : "",
          productType: "PMS",
          requestedLiters: 0,
        }
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "requests",
  });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/station-requests/batch", values);
    if (res.error) {
      setApiError(res.error.message);
      toast.error(res.error.message);
    } else {
      toast.success("Batch fuel request submitted successfully.");
      router.push("/admin/station/requests");
      router.refresh();
    }
  };

  const getProductStockString = (stationId: string, productType: string) => {
    if (!stationId) return null;
    const station = stations.find(s => s.stationId === stationId);
    if (!station) return null;
    
    const pType = productType as keyof StationStockData["stock"];
    const stock = station.stock[pType] || 0;
    const expected = station.expected[pType] || 0;
    
    if (stock === 0 && expected === 0) return null;
    
    const format = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1).replace(/\.0$/, '')}k` : n.toString();
    
    return `Stock: ${format(stock)}${expected > 0 ? ` (+${format(expected)})` : ''}`;
  };

  return (
    <div className="w-full max-w-4xl space-y-8 animate-in fade-in duration-500">
      <StationStockSummary data={stations} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card p-6 rounded-xl border shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <h3 className="text-lg font-semibold tracking-tight">Request Details</h3>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="gap-2 rounded-full h-8 px-3"
            onClick={() => append({ stationId: "", productType: "PMS", requestedLiters: 0 })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Line
          </Button>
        </div>

        {apiError && <p className="text-sm text-red-600 font-medium">{apiError}</p>}
        {form.formState.errors.requests?.root && (
          <p className="text-sm text-red-600 font-medium">{form.formState.errors.requests.root.message}</p>
        )}

        <div className="space-y-4">
          {fields.map((field, index) => {
            const currentStationId = form.watch(`requests.${index}.stationId`);
            const currentProductType = form.watch(`requests.${index}.productType`);
            const stockStr = getProductStockString(currentStationId, currentProductType);

            return (
              <div key={field.id} className="flex items-start gap-4 p-4 border rounded-lg bg-stone-50/50 dark:bg-stone-900/50 relative group">
                <div className="flex-1 grid grid-cols-12 gap-4">
                  <div className="col-span-5 space-y-2">
                    <Label className={form.formState.errors.requests?.[index]?.stationId ? "text-destructive" : ""}>Station *</Label>
                    <Controller
                      control={form.control}
                      name={`requests.${index}.stationId`}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <SelectTrigger className={form.formState.errors.requests?.[index]?.stationId ? "border-destructive" : ""}>
                            <SelectValue placeholder="Select Station" />
                          </SelectTrigger>
                          <SelectContent>
                            {stations.map((s) => (
                              <SelectItem key={s.stationId} value={s.stationId}>
                                {s.stationName} ({s.stationCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.requests?.[index]?.stationId && (
                      <p className="text-xs text-destructive">{form.formState.errors.requests?.[index]?.stationId?.message}</p>
                    )}
                  </div>

                  <div className="col-span-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className={form.formState.errors.requests?.[index]?.productType ? "text-destructive" : ""}>Product *</Label>
                      {stockStr && (
                        <span className="text-[10px] text-muted-foreground font-medium bg-muted px-1.5 py-0.5 rounded">
                          {stockStr}
                        </span>
                      )}
                    </div>
                    <Controller
                      control={form.control}
                      name={`requests.${index}.productType`}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <SelectTrigger className={form.formState.errors.requests?.[index]?.productType ? "border-destructive" : ""}>
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

                  <div className="col-span-3 space-y-2">
                    <Label className={form.formState.errors.requests?.[index]?.requestedLiters ? "text-destructive" : ""}>Volume (L) *</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 15000"
                      {...form.register(`requests.${index}.requestedLiters`)}
                      className={form.formState.errors.requests?.[index]?.requestedLiters ? "border-destructive" : ""}
                    />
                    {form.formState.errors.requests?.[index]?.requestedLiters && (
                      <p className="text-xs text-destructive">{form.formState.errors.requests?.[index]?.requestedLiters?.message}</p>
                    )}
                  </div>
                </div>

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-7 text-muted-foreground hover:text-destructive h-10 w-10 shrink-0"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2 pt-4">
          <Label>Batch Notes (Optional)</Label>
          <Textarea
            placeholder="Any specific requests or timing constraints for this batch?"
            {...form.register("notes")}
            className="resize-none"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="ghost" onClick={() => router.push("/admin/station/requests")} className="h-10 rounded-full px-6">
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting} className="h-10 rounded-full px-6 min-w-[140px]">
            {form.formState.isSubmitting ? <SpinnerEllipsis /> : "Submit Batch Request"}
          </Button>
        </div>
      </form>
    </div>
  );
}
