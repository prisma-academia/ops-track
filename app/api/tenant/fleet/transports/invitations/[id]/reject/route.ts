import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { handleError } from "@/lib/api/errors";
import { redirect } from "next/navigation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const meta = requestMeta(request);
    
    // We are awaiting params in Next.js 15
    const id = (await params).id;

    const invitation = await prisma.transportInvitation.findFirst({
      where: { id: id, tenantId: actor.tenantId }
    });

    if (!invitation) {
      return new Response("Not found", { status: 404 });
    }

    await prisma.transportInvitation.update({
      where: { id: id },
      data: { status: "REJECTED", respondedAt: new Date() }
    });

    await audit({
      module: "FLEET",
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "transport_invitation.reject",
      tenantId: actor.tenantId,
      targetType: "TransportInvitation",
      targetId: id,
      after: { status: "REJECTED" } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return redirect("/admin/fleet/transports");
  } catch (e) {
    return handleError(e);
  }
}
