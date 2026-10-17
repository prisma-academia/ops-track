import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Fuel, MapPin } from "lucide-react";
import { formatDepotRow } from "@/lib/fleet/depots";
import { DepotDetailActions } from "./depot-detail-actions";

function InfoField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

export default async function DepotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);
  const canEdit = hasPermission(actor, PERMISSIONS.TENANT_FLEET_WRITE.key);

  const depot = await prisma.depot.findFirst({
    where: { id, tenantId: actor.tenantId },
  });
  if (!depot) notFound();

  const formatted = formatDepotRow(depot);
  const orders = await prisma.order.findMany({
    where: {
      tenantId: actor.tenantId,
      sourceDepot: { equals: depot.name, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      reference: true,
      productType: true,
      litersOrdered: true,
      status: true,
      createdAt: true,
    },
  });

  const ordersCount = await prisma.order.count({
    where: {
      tenantId: actor.tenantId,
      sourceDepot: { equals: depot.name, mode: "insensitive" },
    },
  });

  const initials = depot.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const locationLine = [formatted.state, formatted.lga, formatted.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      <PageHeader title={depot.name} backHref="/admin/depots" />

      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border border-border/50 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials || <Fuel className="h-5 w-5 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold">{depot.name}</CardTitle>
              <CardDescription className="text-xs">
                Loading depot profile and linked fleet orders.
              </CardDescription>
            </div>
          </div>
          <CardAction className="flex flex-wrap items-center gap-2">
            <DepotDetailActions
              canEdit={canEdit}
              depot={{
                id: depot.id,
                name: depot.name,
                country: formatted.country ?? "",
                state: formatted.state ?? "",
                lga: formatted.lga ?? "",
                latitude:
                  formatted.latitude != null ? String(formatted.latitude) : "",
                longitude:
                  formatted.longitude != null ? String(formatted.longitude) : "",
              }}
            />
          </CardAction>
        </CardHeader>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <InfoField label="Country">{formatted.country || "—"}</InfoField>
          <InfoField label="State">{formatted.state || "—"}</InfoField>
          <InfoField label="LGA">{formatted.lga || "—"}</InfoField>
          <InfoField label="Coordinates">
            {formatted.latitude != null && formatted.longitude != null
              ? `${formatted.latitude}, ${formatted.longitude}`
              : "—"}
          </InfoField>
          <InfoField label="Location summary">
            {locationLine || "—"}
          </InfoField>
          <InfoField label="Orders using this depot">{ordersCount.toLocaleString()}</InfoField>
          <InfoField label="Added">
            {new Date(formatted.createdAt).toLocaleDateString()}
          </InfoField>
        </CardContent>
      </Card>

      {orders.length > 0 && (
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Recent orders
            </CardTitle>
            <CardDescription>Orders with source depot matching this name.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between py-3 text-sm hover:bg-muted/40 -mx-2 px-2 rounded-md"
              >
                <span className="font-medium">{order.reference || order.id.slice(0, 8)}</span>
                <span className="text-muted-foreground">
                  {order.productType} · {Number(order.litersOrdered).toLocaleString()} L
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
