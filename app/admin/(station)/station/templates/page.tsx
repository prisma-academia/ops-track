import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader, Card } from "@/components/shell";

export default async function TemplatesPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_TEMPLATES_READ.key);
  const templates = await prisma.template.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div>
      <PageHeader title="Templates" />
      <Card>
        {templates.length === 0 ? (
          <p className="text-sm text-stone-600">No templates yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-stone-500">
                <th className="py-2">Name</th>
                <th>Type</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-t border-stone-100">
                  <td className="py-2">{t.name}</td>
                  <td className="font-mono text-xs">{t.type}</td>
                  <td className="text-xs text-stone-500">{t.createdAt.toISOString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
