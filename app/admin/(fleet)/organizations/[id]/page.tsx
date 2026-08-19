import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Building2 } from "lucide-react";
import { EditOrgForm } from "./edit-form";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORGANIZATIONS_READ.key);
  
  const org = await prisma.organization.findUnique({ 
    where: { id, tenantId: actor.tenantId },
    include: {
      _count: {
        select: { stations: true, users: true }
      }
    }
  });

  if (!org) notFound();

  const [users, stations] = await Promise.all([
    prisma.tenantUser.findMany({
      where: { tenantId: actor.tenantId },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { email: "asc" }
    }),
    prisma.station.findMany({
      where: { tenantId: actor.tenantId, organizationId: org.id },
      select: { id: true, name: true, code: true, location: true, state: true, lga: true },
      orderBy: { name: "asc" }
    }),
  ]);
  
  // Enforce org scope constraint for restricted users viewing details
  if (actor.organizationId && actor.organizationId !== org.id) {
    notFound();
  }

  const initials = org.name
    ? org.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase()
    : "OR";

  const logoSrc = org.logoKey
    ? org.logoKey.startsWith("http")
      ? org.logoKey
      : `https://${process.env.NEXT_PUBLIC_S3_DOMAIN}/${org.logoKey}`
    : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title={org.name} backHref="/admin/organizations" />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="border-border/40 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40 flex flex-row items-center gap-4">
              <Avatar className="h-12 w-12 border border-border/50 shrink-0">
                {logoSrc && <AvatarImage src={logoSrc} alt={org.name} className="object-cover" />}
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">{org.name}</CardTitle>
                <CardDescription className="text-xs">General profile and contact details.</CardDescription>
              </div>
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
                  <dd className="mt-1">{org.companyEmail || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</dt>
                  <dd className="mt-1">{org.companyPhone || "—"}</dd>
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
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/40">
              <div>
                <CardTitle className="text-lg font-semibold text-foreground">Assigned Stations</CardTitle>
                <CardDescription className="text-xs">
                  Fuel stations under {org.name} ({stations.length})
                </CardDescription>
              </div>
              <Building2 className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-4">
              {stations.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  No stations assigned to this organization yet.
                </div>
              ) : (
                <div className="divide-y divide-border/40">
                  {stations.map((station) => (
                    <div key={station.id} className="py-3 flex items-center justify-between">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-foreground">{station.name}</span>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {station.code}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {[station.location, station.lga, station.state].filter(Boolean).join(", ") || "No location specified"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              users={users}
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

