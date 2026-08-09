import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { assertOrgAccess } from "@/lib/auth/org-scope";
import { EditOrgForm } from "./edit-form";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_ORGS_READ.key);
  
  const org = await prisma.organization.findUnique({ 
    where: { id, tenantId: actor.tenantId },
    include: {
      _count: {
        select: { stations: true, users: true }
      }
    }
  });

  if (!org) notFound();
  
  // Enforce org scope constraint for restricted users viewing details
  if (actor.organizationId && actor.organizationId !== org.id) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader title={org.name} backHref="/admin/fleet/organizations" />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-semibold text-foreground">Organization Details</CardTitle>
              <CardDescription className="text-xs">General profile and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</dt>
                  <dd className="mt-1 font-medium">{org.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</dt>
                  <dd className="mt-1"><Badge variant={org.type === "INTERNAL" ? "default" : "secondary"}>{org.type}</Badge></dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</dt>
                  <dd className="mt-1">{org.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</dt>
                  <dd className="mt-1">{org.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Person</dt>
                  <dd className="mt-1">{org.contactPerson || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact Position</dt>
                  <dd className="mt-1">{org.contactPosition || "—"}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</dt>
                  <dd className="mt-1">{[org.address, org.lga, org.state].filter(Boolean).join(", ") || "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-lg font-semibold text-foreground">Metrics</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stations Assigned</dt>
                  <dd className="mt-1 text-2xl font-bold">{org._count.stations}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Users Provisioned</dt>
                  <dd className="mt-1 text-2xl font-bold">{org._count.users}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          {!actor.organizationId && (
            <EditOrgForm 
              organization={{
                ...org,
                outstandingBalance: org.outstandingBalance.toNumber(),
                depositBalance: org.depositBalance.toNumber(),
              } as any} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
