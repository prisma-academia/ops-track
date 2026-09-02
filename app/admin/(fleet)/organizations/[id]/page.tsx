import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PageHeader } from "@/components/shell";
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, Landmark, Banknote, Droplet, Clock, Pencil, ReceiptText } from "lucide-react";
import { cn, formatShortCurrency } from "@/lib/utils";
import { AssignedStationsTable, type AssignedStationRow } from "./assigned-stations-table";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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
        select: { stations: true, users: true },
      },
    },
  });

  if (!org) notFound();

  if (actor.organizationId && actor.organizationId !== org.id) {
    notFound();
  }

  const [stations, deliveries] = await Promise.all([
    prisma.station.findMany({
      where: { tenantId: actor.tenantId, organizationId: org.id },
      select: { id: true, name: true, code: true, location: true, state: true, lga: true },
      orderBy: { name: "asc" },
    }),
    prisma.delivery.findMany({
      where: {
        tenantId: actor.tenantId,
        OR: [{ organizationId: org.id }, { station: { organizationId: org.id } }],
      },
      select: {
        stationId: true,
        litersReceived: true,
        totalExpectedAmount: true,
        paymentReceived: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  type StationAgg = {
    debt: number;
    payment: number;
    paid: number;
    litersCollected: number;
    lastCollectedAt: Date | null;
    deliveryCount: number;
  };

  const aggs = new Map<string, StationAgg>();
  for (const delivery of deliveries) {
    if (!delivery.stationId) continue;
    const current = aggs.get(delivery.stationId) ?? {
      debt: 0,
      payment: 0,
      paid: 0,
      litersCollected: 0,
      lastCollectedAt: null,
      deliveryCount: 0,
    };
    const expected = Number(delivery.totalExpectedAmount);
    const paid = Number(delivery.paymentReceived);
    current.payment += expected;
    current.paid += paid;
    current.debt += Math.max(0, expected - paid);
    current.litersCollected += Number(delivery.litersReceived ?? 0);
    current.deliveryCount += 1;
    if (delivery.litersReceived != null) {
      const collectedAt = delivery.updatedAt ?? delivery.createdAt;
      if (!current.lastCollectedAt || collectedAt > current.lastCollectedAt) {
        current.lastCollectedAt = collectedAt;
      }
    }
    aggs.set(delivery.stationId, current);
  }

  const stationRows: AssignedStationRow[] = stations.map((station) => {
    const agg = aggs.get(station.id);
    return {
      id: station.id,
      name: station.name,
      code: station.code,
      location: [station.location, station.lga, station.state].filter(Boolean).join(", "),
      debt: agg?.debt ?? 0,
      payment: agg?.payment ?? 0,
      paid: agg?.paid ?? 0,
      litersCollected: agg?.litersCollected ?? 0,
      lastCollectedAt: agg?.lastCollectedAt?.toISOString() ?? null,
      deliveryCount: agg?.deliveryCount ?? 0,
    };
  });

  const totals = stationRows.reduce(
    (acc, row) => {
      acc.debt += row.debt;
      acc.payment += row.payment;
      acc.paid += row.paid;
      acc.litersCollected += row.litersCollected;
      acc.deliveries += row.deliveryCount;
      if (row.lastCollectedAt) {
        const date = new Date(row.lastCollectedAt);
        if (!acc.lastCollectedAt || date > acc.lastCollectedAt) {
          acc.lastCollectedAt = date;
        }
      }
      return acc;
    },
    {
      debt: 0,
      payment: 0,
      paid: 0,
      litersCollected: 0,
      deliveries: 0,
      lastCollectedAt: null as Date | null,
    }
  );

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

  const lastCollectedLabel = totals.lastCollectedAt
    ? totals.lastCollectedAt.toLocaleDateString()
    : "—";

  const statCards = [
    {
      title: "Stations",
      value: org._count.stations.toLocaleString(),
      fullValue: null as string | null,
      icon: Building2,
      iconColor: "text-teal-600",
    },
    {
      title: "Debt",
      value: formatShortCurrency(totals.debt),
      fullValue: formatNaira(totals.debt),
      icon: Landmark,
      iconColor: "text-rose-600",
      valueColor: totals.debt > 0 ? "text-rose-600" : undefined,
    },
    {
      title: "Payment",
      value: formatShortCurrency(totals.payment),
      fullValue: formatNaira(totals.payment),
      icon: ReceiptText,
      iconColor: "text-indigo-600",
    },
    {
      title: "Paid",
      value: formatShortCurrency(totals.paid),
      fullValue: formatNaira(totals.paid),
      icon: Banknote,
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-600",
    },
    {
      title: "Litres Collected",
      value: `${totals.litersCollected.toLocaleString()} L`,
      fullValue: `${totals.litersCollected.toLocaleString()} Liters`,
      icon: Droplet,
      iconColor: "text-blue-600",
      valueColor: "text-blue-600",
    },
    {
      title: "Last Collected",
      value: lastCollectedLabel,
      fullValue: totals.lastCollectedAt ? totals.lastCollectedAt.toLocaleString() : null,
      icon: Clock,
      iconColor: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={org.name}
        backHref="/admin/organizations"
        action={
          !actor.organizationId ? (
            <Button asChild>
              <Link href={`/admin/organizations/${org.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          ) : undefined
        }
      />

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-border/50 shrink-0">
              {logoSrc && <AvatarImage src={logoSrc} alt={org.name} className="object-cover" />}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">{org.name}</CardTitle>
              <CardDescription className="text-xs">
                General profile, contact details, and collection totals.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Badge variant={org.type === "INTERNAL" ? "default" : "secondary"}>
              {org.type}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 text-sm">
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</dt>
              <dd className="mt-1 font-medium">{org.companyEmail || "—"}</dd>
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
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Users Provisioned</dt>
              <dd className="mt-1">{org._count.users}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</dt>
              <dd className="mt-1">{[org.address, org.lga, org.state].filter(Boolean).join(", ") || "—"}</dd>
            </div>
          </dl>

          <TooltipProvider delayDuration={200}>
            <div className="rounded-lg border border-border/40 overflow-hidden grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-px bg-border">
              {statCards.map((item) => (
                <div key={item.title} className="bg-card">
                  {item.fullValue ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="p-4 flex items-start justify-between cursor-default hover:bg-muted/30 transition-colors h-full">
                          <div className="flex flex-col gap-2">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                            <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>
                              {item.value}
                            </p>
                          </div>
                          <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                            <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="font-mono text-sm tracking-tight px-3 py-1.5">
                        {item.fullValue}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="p-4 flex items-start justify-between h-full">
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                        <p className={cn("text-md font-semibold text-card-foreground", item.valueColor)}>
                          {item.value}
                        </p>
                      </div>
                      <div className="p-2.5 rounded-full bg-muted/30 outline outline-1 outline-border/50">
                        <item.icon size={14} className={cn("text-muted-foreground", item.iconColor)} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Assigned Stations</h2>
          <p className="text-sm text-muted-foreground">
            Fuel stations under {org.name} ({stations.length})
          </p>
        </div>
        <AssignedStationsTable data={stationRows} />
      </div>
    </div>
  );
}
