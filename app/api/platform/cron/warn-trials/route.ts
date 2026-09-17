import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { sendEmail } from "@/lib/email/send";

/**
 * Vercel Cron: 0 8 * * *  (daily at 08:00 UTC)
 * Sends warning emails at 5-day and 1-day marks before trial expiry.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const in1Day  = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

  function dateRange(base: Date) {
    const start = new Date(base); start.setHours(0, 0, 0, 0);
    const end   = new Date(base); end.setHours(23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  async function notify(windowDate: Date, label: string) {
    const tenants = await prisma.tenant.findMany({
      where: {
        status: "ACTIVE",
        trialEndsAt: dateRange(windowDate),
        subscriptions: { none: { status: "ACTIVE", endDate: { gt: now } } },
      },
      include: { users: { where: { isOwner: true }, take: 1, select: { email: true, firstName: true } } },
    });
    for (const tenant of tenants) {
      const owner = tenant.users[0];
      if (!owner) continue;
      try {
        await sendEmail({
          to: owner.email,
          subject: `Your OpsTrack trial expires ${label}`,
          html: `<p>Hi ${owner.firstName ?? "there"},</p><p>Your trial for <strong>${tenant.name}</strong> expires <strong>${label}</strong>. Contact us to keep access.</p>`,
        });
      } catch { /* ignore */ }
    }
    return tenants.length;
  }

  const [sent5d, sent1d] = await Promise.all([
    notify(in5Days, "in 5 days"),
    notify(in1Day, "tomorrow"),
  ]);

  return NextResponse.json({ sent5DayWarnings: sent5d, sent1DayWarnings: sent1d });
}