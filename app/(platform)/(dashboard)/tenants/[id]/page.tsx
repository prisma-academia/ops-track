import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { resolveLogoUrl } from "@/lib/email/branding";
import { resolveActivityLogRows } from "@/lib/activity/resolver";
import { buildOffsetPageMeta } from "@/lib/api/pagination";
import { failedActivityWhere } from "@/lib/activity/status";
import { PageHeader } from "@/components/shell";
import { Card, CardAction, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { TenantActions, TenantModuleToggle, TrialControls, PlatformControls, TenantNotesEditor, RevokeSubscriptionButton } from "./actions";
import { TenantActivityTab } from "./activity-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TenantStatusBadge } from "../../_components/tenant-status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Building2,
  Fuel,
  Globe,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Truck,
  Users,
  UserRound,
  Plus,
  SlidersHorizontal,
  FileText,
  CalendarClock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function personName(user: { firstName: string | null; lastName: string | null; email: string }) {
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
}

function isModuleOn(
  module: "STATION" | "FLEET",
  activeModules: string[],
  records: { module: string; status: string }[],
) {
  const record = records.find((m) => m.module === module);
  if (record) return record.status === "ACTIVE";
  if (activeModules.length === 0) return true;
  return activeModules.includes(module);
}

export default async function TenantDrilldownPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformPage(PERMISSIONS.PLATFORM_TENANTS_READ.key);
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, clients: true, stations: true, organizations: true } },
      modules: { select: { module: true, status: true } },
      subscriptions: { orderBy: { recordedAt: "desc" } },
    },
  });
  if (!tenant) notFound();

  const users = await prisma.tenantUser.findMany({
    where: { tenantId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
      isOwner: true,
      lastLoginAt: true,
    },
  });

  const ACTIVITY_PAGE_SIZE = 20;
  const [activityCount, rawActivityRows] = await Promise.all([
    prisma.activityLog.count({ where: { tenantId: id } }),
    prisma.activityLog.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: "desc" },
      take: ACTIVITY_PAGE_SIZE,
      include: { tenant: { select: { name: true } } },
    }),
  ]);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const [failedCount, todayCount] = await Promise.all([
    prisma.activityLog.count({ where: { tenantId: id, ...failedActivityWhere() } }),
    prisma.activityLog.count({ where: { tenantId: id, createdAt: { gte: startOfToday } } }),
  ]);
  const initialActivityRows = await resolveActivityLogRows(rawActivityRows);
  const initialActivityMeta = {
    ...buildOffsetPageMeta(activityCount, 1, ACTIVITY_PAGE_SIZE),
    stats: {
      total: activityCount,
      success: activityCount - failedCount,
      failed: failedCount,
      today: todayCount,
    },
  };

  const owner = users.find((u) => u.isOwner) ?? null;
  const logoUrl = resolveLogoUrl(parseTenantSettings(tenant.settingsJson).logoKey);
  const stationOn = isModuleOn("STATION", tenant.activeModules, tenant.modules);
  const fleetOn = isModuleOn("FLEET", tenant.activeModules, tenant.modules);
  const address = [tenant.addressLine1, tenant.addressLine2, tenant.city, tenant.region, tenant.postalCode, tenant.country]
    .filter(Boolean)
    .join(", ");

  const stats = [
    { title: "Users", value: tenant._count.users, icon: Users, tone: "text-sky-600" },
    { title: "Clients", value: tenant._count.clients, icon: UserRound, tone: "text-indigo-600" },
    { title: "Stations", value: tenant._count.stations, icon: Fuel, tone: "text-teal-600" },
    { title: "Organizations", value: tenant._count.organizations, icon: Landmark, tone: "text-primary" },
  ];

  const websiteHref = tenant.website
    ? tenant.website.startsWith("http")
      ? tenant.website
      : `https://${tenant.website}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title={tenant.name} backHref="/tenants" action={<TenantActions tenantId={tenant.id} status={tenant.status} />} />

      <Card>
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar className="h-12 w-12 rounded-lg after:rounded-lg">
              {logoUrl ? <AvatarImage src={logoUrl} alt={tenant.name} className="rounded-lg object-contain" /> : null}
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                {initials(tenant.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <CardTitle className="truncate text-lg font-semibold">{tenant.name}</CardTitle>
              <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                <span className="font-mono text-xs">{tenant.slug}</span>
                {owner ? (
                  <span className="text-xs">
                    · Owner {personName(owner)}
                  </span>
                ) : null}
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <TenantStatusBadge status={tenant.status} />
          </CardAction>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
          <div className="rounded-lg border border-border/40 overflow-hidden grid grid-cols-2 md:grid-cols-4 gap-px bg-border">
            {stats.map((item) => (
              <div key={item.title} className="bg-card p-4 flex items-start justify-between">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.title}</p>
                  <p className="text-lg font-semibold tabular-nums">{item.value.toLocaleString()}</p>
                </div>
                <div className="p-2.5 rounded-full bg-muted/30 ring-1 ring-border/50">
                  <item.icon size={14} className={cn("text-muted-foreground", item.tone)} />
                </div>
              </div>
            ))}
          </div>

          <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-5 text-sm">
            <MetaField icon={Mail} label="Company email" value={tenant.companyEmail} />
            <MetaField icon={Phone} label="Company phone" value={tenant.companyPhone} />
            <MetaField
              icon={Globe}
              label="Website"
              value={
                websiteHref ? (
                  <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    {tenant.website}
                  </a>
                ) : null
              }
            />
            <MetaField icon={MapPin} label="Address" value={address || null} />
            <MetaField icon={Building2} label="Created" value={tenant.createdAt.toLocaleString()} />
            {owner ? <MetaField icon={UserRound} label="Owner" value={`${personName(owner)} · ${owner.email}`} /> : null}
          </dl>
        </CardContent>
      </Card>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ModuleCard
              icon={Fuel}
              title="Station Management"
              description="Fuel stations, tanks, pumps, shifts, and retail operations."
              tenantId={tenant.id}
              module="STATION"
              enabled={stationOn}
            />
            <ModuleCard
              icon={Truck}
              title="Fleet Management"
              description="Trucks, orders, deliveries, and transport operations."
              tenantId={tenant.id}
              module="FLEET"
              enabled={fleetOn}
            />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Tenant users</CardTitle>
              <CardDescription>{users.length} provisioned accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last login</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                        No users found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar size="sm">
                              <AvatarFallback>{initials(personName(u))}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="font-medium truncate">{personName(u)}</div>
                              <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {u.isOwner ? (
                            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                              Owner
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Member</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              u.status === "ACTIVE"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-destructive/30 bg-destructive/10 text-destructive"
                            }
                          >
                            {u.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {u.lastLoginAt ? u.lastLoginAt.toLocaleString() : "Never"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controls" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* ── Trial Panel ── */}
            <Card>
              <CardHeader className="border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Trial</CardTitle>
                </div>
                <CardDescription className="text-xs">Configure the trial window for this tenant.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <TrialControls
                  tenantId={tenant.id}
                  trialDays={tenant.trialDays}
                  trialStartedAt={tenant.trialStartedAt?.toISOString() ?? null}
                  trialEndsAt={tenant.trialEndsAt?.toISOString() ?? null}
                />
              </CardContent>
            </Card>

            {/* ── Platform Controls ── */}
            <Card>
              <CardHeader className="border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4 text-primary" />
                  <CardTitle className="text-sm font-semibold">Platform Controls</CardTitle>
                </div>
                <CardDescription className="text-xs">Capacity limits and feature gates.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <PlatformControls
                  tenantId={tenant.id}
                  settings={{
                    maxUsers: parseTenantSettings(tenant.settingsJson).maxUsers,
                    maxStations: parseTenantSettings(tenant.settingsJson).maxStations,
                    maxOrganizations: parseTenantSettings(tenant.settingsJson).maxOrganizations,
                    allowClientPortal: parseTenantSettings(tenant.settingsJson).allowClientPortal,
                    allowApiAccess: parseTenantSettings(tenant.settingsJson).allowApiAccess,
                    maintenanceMode: parseTenantSettings(tenant.settingsJson).maintenanceMode,
                    maintenanceMessage: parseTenantSettings(tenant.settingsJson).maintenanceMessage,
                  }}
                />
              </CardContent>
            </Card>

            {/* ── Subscription History ── */}
            <Card className="md:col-span-2">
              <CardHeader className="border-b border-border/40 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    <CardTitle className="text-sm font-semibold">Subscription History</CardTitle>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/subscriptions/new?tenantId=${tenant.id}`}>
                      <Plus className="size-3.5" />
                      Record Payment
                    </Link>
                  </Button>
                </div>
                <CardDescription className="text-xs">Manually recorded B2B deals for this tenant.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {tenant.subscriptions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No payments recorded yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Recorded</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenant.subscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium tabular-nums">
                            {sub.currency} {Number(sub.amount).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sub.startDate.toLocaleDateString()} — {sub.endDate.toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{sub.description ?? "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{sub.receiptRef ?? "—"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-medium",
                                sub.status === "ACTIVE"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                  : sub.status === "EXPIRED"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                  : "border-destructive/30 bg-destructive/10 text-destructive"
                              )}
                            >
                              {sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {sub.recordedAt.toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {sub.status === "ACTIVE" && <RevokeSubscriptionButton subscriptionId={sub.id} />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* ── Internal Notes ── */}
            <Card className="md:col-span-2">
              <CardHeader className="border-b border-border/40 pb-3">
                <CardTitle className="text-sm font-semibold">Internal Notes</CardTitle>
                <CardDescription className="text-xs">Private notes — not visible to the tenant.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <TenantNotesEditor tenantId={tenant.id} initialNotes={tenant.notes ?? null} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <TenantActivityTab
            tenantId={tenant.id}
            initialData={initialActivityRows as any}
            initialMeta={initialActivityMeta as any}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetaField({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex gap-3 min-w-0">
      <div className="mt-0.5 p-2 rounded-md bg-muted/40 ring-1 ring-border/50 h-fit">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</dt>
        <dd className="mt-1 font-medium text-foreground break-words">{value || "—"}</dd>
      </div>
    </div>
  );
}

function ModuleCard({
  icon: Icon,
  title,
  description,
  tenantId,
  module,
  enabled,
}: {
  icon: typeof Fuel;
  title: string;
  description: string;
  tenantId: string;
  module: "STATION" | "FLEET";
  enabled: boolean;
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-primary/10 ring-1 ring-primary/20 h-fit">
              <Icon className="size-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          </div>
          <TenantModuleToggle tenantId={tenantId} module={module} enabled={enabled} />
        </div>
      </CardContent>
    </Card>
  );
}
