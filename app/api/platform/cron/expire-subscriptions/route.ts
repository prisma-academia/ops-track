import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/env";

/**
 * Vercel Cron: 0 7 * * *  (daily at 07:00 UTC)
 * Marks expired subscriptions and alerts platform admin. Does NOT auto-suspend tenants.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expiredSubs = await prisma.tenantSubscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    include: { tenant: { select: { name: true } } },
  });

  for (const sub of expiredSubs) {
    await prisma.tenantSubscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
  }

  if (expiredSubs.length > 0) {
    const list = expiredSubs.map((s) => `- ${s.tenant.name} (ends ${s.endDate.toDateString()})`).join("\n");
    try {
      await sendEmail({
        to: env.PLATFORM_ADMIN_EMAIL ?? "admin@opstrack.app",
        subject: `${expiredSubs.length} subscription(s) expired — action required`,
        html: `<p>The following subscriptions have expired and may need renewal or suspension:</p><pre>${list}</pre>`,
      });
    } catch { /* ignore */ }
  }

  return NextResponse.json({ expired: expiredSubs.length });
}