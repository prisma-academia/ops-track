"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { apiPatch } from "@/lib/client/api";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().or(z.literal("")).nullable(),
  address: z.string().optional().or(z.literal("")).nullable(),
  state: z.string().optional().or(z.literal("")).nullable(),
  lga: z.string().optional().or(z.literal("")).nullable(),
  contactPerson: z.string().optional().or(z.literal("")).nullable(),
  contactPhone: z.string().optional().or(z.literal("")).nullable(),
  contactPosition: z.string().optional().or(z.literal("")).nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditOrgForm({ organization }: { organization: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name || "",
      type: organization.type || "EXTERNAL",
      email: organization.email || "",
      phone: organization.phone || "",
      address: organization.address || "",
      state: organization.state || "",
      lga: organization.lga || "",
      contactPerson: organization.contactPerson || "",
      contactPhone: organization.contactPhone || "",
      contactPosition: organization.contactPosition || "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiPatch<{ organization: any }>(`/api/tenant/organizations/${organization.id}`, data);
      
      if (res.error) {
        setErrorMsg(res.error.message);
        return;
      }

      toast("Organization updated", {
        description: "The organization profile has been successfully saved.",
      });
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-4 border-b border-border/40">
        <CardTitle className="text-lg font-semibold text-foreground">Edit Organization</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {errorMsg}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>Organization Name*</Label>
            <Input id="name" placeholder="e.g. Acme Logistics" {...register("name")} className={errors.name ? "border-destructive" : ""} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type*</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal (Own Company)</SelectItem>
                    <SelectItem value="EXTERNAL">External (Client)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-xs text-destructive">{errors.type.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className={errors.email ? "text-destructive" : ""}>Email Address</Label>
            <Input id="email" type="email" placeholder="contact@acme.com" {...register("email")} className={errors.email ? "border-destructive" : ""} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" placeholder="+234..." {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input id="contactPerson" placeholder="John Doe" {...register("contactPerson")} />
            {errors.contactPerson && <p className="text-xs text-destructive">{errors.contactPerson.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPosition">Contact Position</Label>
            <Input id="contactPosition" placeholder="Manager" {...register("contactPosition")} />
            {errors.contactPosition && <p className="text-xs text-destructive">{errors.contactPosition.message as string}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="123 Business Way" {...register("address")} />
            {errors.address && <p className="text-xs text-destructive">{errors.address.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lga">LGA</Label>
              <Input id="lga" placeholder="LGA" {...register("lga")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="State" {...register("state")} />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
