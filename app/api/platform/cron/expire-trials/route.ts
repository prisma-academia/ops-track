import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { revokeAllSessionsForTenant } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";

/**
 * Vercel Cron: 0 6 * * *  (daily at 06:00 UTC)
 * Suspends tenants whose trial has expired and have no active subscription.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find expired-trial tenants with no active subscription
  const expired = await prisma.tenant.findMany({
    where: {
      status: "ACTIVE",
      trialEndsAt: { lt: now },
      subscriptions: { none: { status: "ACTIVE", endDate: { gt: now } } },
    },
    include: {
      users: { where: { isOwner: true }, take: 1, select: { email: true, firstName: true } },
    },
  });

  let suspended = 0;
  for (const tenant of expired) {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { status: "SUSPENDED" } });
    await revokeAllSessionsForTenant(tenant.id);
    await prisma.activityLog.create({
      data: {
        tenantId: tenant.id,
        actorType: "SYSTEM",
        actorId: "cron:expire-trials",
        action: "tenant.trial_expired",
        targetType: "Tenant",
        targetId: tenant.id,
        afterJson: { status: "SUSPENDED", reason: "trial_expired" },
      },
    });
    const owner = tenant.users[0];
    if (owner) {
      try {
        await sendEmail({
          to: owner.email,
          subject: "Your OpsTrack trial has ended",
          html: `<p>Hi ${owner.firstName ?? "there"},</p><p>Your OpsTrack trial for <strong>${tenant.name}</strong> has ended. Please contact us to continue using the platform.</p>`,
        });
      } catch { /* ignore email errors */ }
    }
    suspended++;
  }

  return NextResponse.json({ suspended, checked: expired.length });
}