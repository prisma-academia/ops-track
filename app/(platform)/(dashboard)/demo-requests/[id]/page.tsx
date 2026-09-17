import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/shell";
import { DemoRequestDetail } from "./_detail";

export default async function DemoRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePlatformPage(PERMISSIONS.PLATFORM_TENANTS_READ.key);
  const { id } = await params;
  const req = await prisma.demoRequest.findUnique({ where: { id } });
  if (!req) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title={req.companyName} backHref="/demo-requests" />
      <DemoRequestDetail
        id={req.id}
        companyName={req.companyName}
        contactName={req.contactName}
        email={req.email}
        phone={req.phone}
        companySize={req.companySize}
        industry={req.industry}
        country={req.country}
        interestedIn={req.interestedIn}
        message={req.message}
        status={req.status}
        reviewNotes={req.reviewNotes}
        scheduledAt={req.scheduledAt?.toISOString() ?? null}
        convertedToTenantId={req.convertedToTenantId}
        createdAt={req.createdAt.toISOString()}
      />
    </div>
  );
}