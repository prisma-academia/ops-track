import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader, Card } from "@/components/shell";
import { TenantActions, TenantModuleToggle } from "./actions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
      _count: { select: { users: true, clients: true } },
    },
  });
  if (!tenant) notFound();

  const [users, recent] = await Promise.all([
    prisma.tenantUser.findMany({
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
    }),
    prisma.activityLog.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <PageHeader title={tenant.name} backHref="/platform/tenants" />

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="basic">Basic info</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase text-stone-500">Slug / Status</div>
                <div className="mt-1 font-mono text-sm">{tenant.slug}</div>
                <div className="mt-1 text-sm">{tenant.status}</div>
              </div>
              <TenantActions tenantId={tenant.id} status={tenant.status} />
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="text-xs uppercase text-stone-500">Tenant users</div>
              <div className="mt-1 text-2xl font-semibold">{tenant._count.users}</div>
            </Card>
            <Card>
              <div className="text-xs uppercase text-stone-500">Clients</div>
              <div className="mt-1 text-2xl font-semibold">{tenant._count.clients}</div>
            </Card>
          </div>

          <Card>
            <h2 className="text-sm font-semibold uppercase text-stone-500 mb-4">Metadata Details</h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-stone-500">Company Email</dt>
              <dd>{tenant.companyEmail ?? "—"}</dd>
              <dt className="text-stone-500">Company Phone</dt>
              <dd>{tenant.companyPhone ?? "—"}</dd>
              <dt className="text-stone-500">Website</dt>
              <dd>
                {tenant.website ? (
                  <a
                    href={tenant.website.startsWith("http") ? tenant.website : `https://${tenant.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {tenant.website}
                  </a>
                ) : (
                  "—"
                )}
              </dd>
              <dt className="text-stone-500">Address Line 1</dt>
              <dd>{tenant.addressLine1 ?? "—"}</dd>
              <dt className="text-stone-500">Address Line 2</dt>
              <dd>{tenant.addressLine2 ?? "—"}</dd>
              <dt className="text-stone-500">City</dt>
              <dd>{tenant.city ?? "—"}</dd>
              <dt className="text-stone-500">Region</dt>
              <dd>{tenant.region ?? "—"}</dd>
              <dt className="text-stone-500">Postal Code</dt>
              <dd>{tenant.postalCode ?? "—"}</dd>
              <dt className="text-stone-500">Country</dt>
              <dd>{tenant.country ?? "—"}</dd>
              <dt className="text-stone-500">Created At</dt>
              <dd>{tenant.createdAt.toLocaleString()}</dd>
            </dl>
          </Card>

          <Card>
            <h2 className="text-sm font-semibold uppercase text-stone-500 mb-4">Modules</h2>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Fleet Management</p>
                <p className="text-xs text-stone-500">Enable fleet, trucks, and order management features.</p>
              </div>
              <TenantModuleToggle 
                tenantId={tenant.id} 
                module="FLEET" 
                enabled={tenant.activeModules.includes("FLEET")} 
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <h2 className="text-sm font-semibold uppercase text-stone-500 mb-4">Tenant Users</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-stone-500">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {`${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        {u.isOwner ? (
                          <span className="inline-flex items-center rounded bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300 ring-1 ring-inset ring-amber-600/20">
                            Owner
                          </span>
                        ) : (
                          <span className="text-stone-500 text-xs">Member</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                            u.status === "ACTIVE"
                              ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 ring-green-600/20"
                              : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 ring-red-600/20"
                          }`}
                        >
                          {u.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-stone-500">
                        {u.lastLoginAt ? u.lastLoginAt.toLocaleString() : "Never"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <h2 className="text-sm font-semibold uppercase text-stone-500 mb-4">Tenant Activity</h2>
            <ul className="divide-y divide-stone-100 dark:divide-stone-800 text-sm">
              {recent.length === 0 ? (
                <li className="py-3 text-stone-500">No activity yet.</li>
              ) : (
                recent.map((l) => (
                  <li key={l.id} className="flex justify-between py-2 items-center">
                    <div>
                      <span className="font-mono text-xs bg-stone-100 dark:bg-stone-850 px-1.5 py-0.5 rounded mr-2 text-stone-700 dark:text-stone-300">
                        {l.action}
                      </span>
                      <span className="text-xs text-stone-400">
                        by {l.actorType.toLowerCase()} ({l.actorId ?? "unknown"})
                      </span>
                    </div>
                    <span className="text-xs text-stone-500">{l.createdAt.toLocaleString()}</span>
                  </li>
                ))
              )}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
