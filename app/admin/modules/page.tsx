import Link from "next/link";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { prisma } from "@/lib/db/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Truck } from "lucide-react";
import { redirect } from "next/navigation";

export default async function ModulesSelectorPage() {
  const actor = await requireTenantPage();
  
  const [tenant, user] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: actor.tenantId } }),
    prisma.tenantUser.findUnique({ where: { id: actor.userId } })
  ]);

  if (!tenant || !user) {
    redirect("/admin/auth/login");
  }

  const availableModules = user.activeModules.filter((m) => tenant.activeModules.includes(m));
  
  if (availableModules.includes("FLEET")) {
    redirect("/admin/fleet");
  } else if (availableModules.includes("STATION")) {
    redirect("/admin/dashboard");
  }

  // If no modules are available
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>No Modules Available</CardTitle>
          <CardDescription>You do not have access to any modules.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
