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
  
  // If only one module is available, redirect directly
  if (availableModules.length === 1) {
    if (availableModules.includes("STATION")) redirect("/admin/dashboard");
    if (availableModules.includes("FLEET")) redirect("/admin/fleet");
  } else if (availableModules.length === 0) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-50 dark:bg-stone-950 p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">Welcome to {tenant.name}</h1>
          <p className="text-stone-500 dark:text-stone-400 mt-2">Select a module to continue</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="flex flex-col h-full hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                <Building2 className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">Station Management</CardTitle>
              <CardDescription className="text-base">
                Manage fuel stations, tanks, pumps, dippings, and shifts.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/admin/dashboard">
                  Enter Station Module
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col h-full hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                <Truck className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl">Fleet Management</CardTitle>
              <CardDescription className="text-base">
                Manage fleet, trucks, drivers, transporters, and orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/admin/fleet">
                  Enter Fleet Module
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
