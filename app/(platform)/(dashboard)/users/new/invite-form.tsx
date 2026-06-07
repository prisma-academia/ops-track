"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { Card } from "@/components/shell";
import { Checkbox } from "@/components/ui/checkbox";

const Schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  otherName: z.string().max(100).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  email: z.email(),
  roleTemplateId: z.string().min(1),
  permissions: z.array(z.string()).optional(),
});
type Values = z.infer<typeof Schema>;

export function InviteUserForm({
  roles,
  allPermissions,
}: {
  roles: { id: string; name: string; permissions: string[] }[];
  allPermissions: readonly string[];
}) {
  const router = useRouter();
  const { register, handleSubmit, formState, control, setValue } = useForm<Values>({
    resolver: zodResolver(Schema),
    defaultValues: { permissions: [] }
  });
  const [error, setError] = useState<string | null>(null);

  const roleTemplateId = useWatch({ control, name: "roleTemplateId" });
  
  useEffect(() => {
    const selectedRole = roles.find((r) => r.id === roleTemplateId);
    if (selectedRole) {
      setValue("permissions", selectedRole.permissions, { shouldDirty: true });
    } else {
      setValue("permissions", []);
    }
  }, [roleTemplateId, roles, setValue]);

  const currentPermissions = useWatch({ control, name: "permissions" }) || [];
  const selectedPermissions = new Set(currentPermissions);

  const togglePermission = (p: string) => {
    const next = selectedPermissions.has(p)
      ? currentPermissions.filter((x) => x !== p)
      : [...currentPermissions, p];
    setValue("permissions", next, { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const res = await apiPost<{ user: { id: string } }>("/api/platform/users", values);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    if (res.data?.user.id) router.push(`/users/${res.data.user.id}`);
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
          <FormField label="First name" htmlFor="f" error={formState.errors.firstName?.message}>
            <TextInput id="f" {...register("firstName")} />
          </FormField>
          <FormField label="Last name" htmlFor="l" error={formState.errors.lastName?.message}>
            <TextInput id="l" {...register("lastName")} />
          </FormField>
          <FormField label="Other name (optional)" htmlFor="o" error={formState.errors.otherName?.message}>
            <TextInput id="o" {...register("otherName")} />
          </FormField>
          <FormField label="Phone (optional)" htmlFor="p" error={formState.errors.phone?.message}>
            <TextInput id="p" type="tel" {...register("phone")} />
          </FormField>
          <FormField label="Email" htmlFor="e" error={formState.errors.email?.message}>
            <TextInput id="e" type="email" {...register("email")} />
          </FormField>
          <FormField label="Role" htmlFor="role" error={formState.errors.roleTemplateId?.message}>
            <select
              id="role"
              className="rounded border border-stone-300 bg-white px-3 py-2 text-sm"
              {...register("roleTemplateId")}
            >
              <option value="">Select…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </FormField>
          {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
          <div className="col-span-2">
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Sending invite…" : "Send invite"}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase text-stone-500 mb-4">Role permissions</h2>
        <div className="grid grid-cols-1 gap-1 rounded border border-stone-200 p-3">
          {allPermissions.map((p) => (
            <label key={p} className="flex items-center gap-2 text-xs">
              <Checkbox
                checked={selectedPermissions.has(p)}
                onCheckedChange={() => togglePermission(p)}
              />
              <span className="font-mono">{p}</span>
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
