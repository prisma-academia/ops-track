import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireClientPage } from "@/lib/auth/page-guards";
import { PageHeader, Card } from "@/components/shell";
import { LogoutButton } from "@/components/logout-button";

export default async function ClientDashboardPage() {
  const actor = await requireClientPage();
  const client = await prisma.client.findUnique({ where: { id: actor.clientId } });
  const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
  if (!client || !tenant) redirect("/auth/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
      <PageHeader
        title={`Welcome to ${tenant.name}`}
        action={
          <LogoutButton
            endpoint="/api/auth/logout"
            postLogoutPath="/auth/login"
            logoutContext="client"
          />
        }
      />
      <Card>
        <div className="text-xs uppercase text-stone-500">Signed in as</div>
        <div className="mt-1 text-sm">{client.email}</div>
      </Card>
      <Card>
        <h2 className="text-sm font-semibold uppercase text-stone-500">Your account</h2>
        <p className="mt-2 text-sm text-stone-600">
          This is the client area for {tenant.name}. Tenant-defined modules will appear here.
        </p>
      </Card>
    </div>
  );
}
