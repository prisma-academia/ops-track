import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { CustomerDetailsClient } from "./customer-details-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserCircle, MapPin, Mail, Phone, Briefcase, Wallet } from "lucide-react";

export default async function CustomerDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_CUSTOMERS_READ.key);

  const customer = await prisma.customer.findUnique({
    where: {
      id: resolvedParams.id,
      tenantId: actor.tenantId,
    },
    include: {
      sales: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
            station: true,
        }
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const totalDebt = Number(customer.outstandingBalance);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">{customer.name}</h1>
          <p className="text-sm text-stone-500">Customer ID: {customer.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Company Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-stone-500 flex items-center gap-2">
              <Building2 size={16} />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <Mail className="size-4 text-stone-400 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900">Email</p>
                <p className="text-stone-600">{customer.email || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Phone className="size-4 text-stone-400 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900">Phone</p>
                <p className="text-stone-600">{customer.phone || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="size-4 text-stone-400 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900">Address</p>
                <p className="text-stone-600">{customer.address || "N/A"}</p>
                {(customer.lga || customer.state) && (
                  <p className="text-stone-500 text-xs mt-0.5">
                    {[customer.lga, customer.state].filter(Boolean).join(", ")}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Person */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-stone-500 flex items-center gap-2">
              <UserCircle size={16} />
              Contact Person
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 text-sm">
              <UserCircle className="size-4 text-stone-400 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900">Name</p>
                <p className="text-stone-600">{customer.contactPerson || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Briefcase className="size-4 text-stone-400 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900">Position</p>
                <p className="text-stone-600">{customer.contactPosition || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Phone className="size-4 text-stone-400 mt-0.5" />
              <div>
                <p className="font-medium text-stone-900">Phone</p>
                <p className="text-stone-600">{customer.contactPhone || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-stone-500 flex items-center gap-2">
              <Wallet size={16} />
              Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="pt-2">
              <p className="text-sm font-medium text-stone-500">Outstanding Balance</p>
              <p className={`text-3xl font-bold tracking-tight ${totalDebt > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₦{totalDebt.toLocaleString()}
              </p>
              <p className="text-xs text-stone-400 mt-1">Current debt amount</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <CustomerDetailsClient sales={JSON.parse(JSON.stringify(customer.sales))} />
      </div>
    </div>
  );
}
