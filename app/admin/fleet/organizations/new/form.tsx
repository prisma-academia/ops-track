"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { apiPost } from "@/lib/client/api";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  slug: z.string().min(2, "Slug must be at least 2 characters").max(50).regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  type: z.enum(["INTERNAL", "EXTERNAL"]),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  contactPerson: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

export function OrganizationForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, control } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      type: "EXTERNAL",
      email: "",
      phone: "",
      address: "",
      contactPerson: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await apiPost<{ organization: any }>("/api/tenant/organizations", data);
      
      if (res.error) {
        setErrorMsg(res.error.message);
        return;
      }

      router.push("/admin/fleet/organizations");
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errorMsg && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name" className={errors.name ? "text-destructive" : ""}>Organization Name*</Label>
              <Input id="name" placeholder="e.g. Acme Logistics" {...register("name")} className={errors.name ? "border-destructive" : ""} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug" className={errors.slug ? "text-destructive" : ""}>Short Identifier (Slug)*</Label>
              <Input id="slug" placeholder="e.g. acme-logistics" {...register("slug")} className={errors.slug ? "border-destructive" : ""} />
              {errors.slug && <p className="text-xs text-destructive">{errors.slug.message as string}</p>}
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

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" placeholder="123 Business Way" {...register("address")} />
              {errors.address && <p className="text-xs text-destructive">{errors.address.message as string}</p>}
            </div>
          </div>
          
          <div className="flex justify-end gap-4 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
