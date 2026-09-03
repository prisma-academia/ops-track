import { prisma } from "@/lib/db/client";
import { parseTenantSettings } from "@/lib/tenant/settings";
import { resolveLogoUrl } from "@/lib/email/branding";

export type MonthlyPoint = {
  key: string;
  label: string;
  tenants: number;
  users: number;
};

export type RecentTenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  logoUrl: string | null;
  ownerName: string | null;
  createdAt: string;
};

export type PlatformOverviewData = {
  kpis: {
    tenants: number;
    tenantChange: number | null;
    platformUsers: number;
    tenantUsers: number;
    stations: number;
  };
  counts: {
    organizations: number;
    clients: number;
    active: number;
    suspended: number;
    archived: number;
    fleet: number;
    station: number;
  };
  monthly: MonthlyPoint[];
  recentTenants: RecentTenant[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [, month] = key.split("-");
  return MONTHS[Number(month) - 1] ?? key;
}

function ratioChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 1 : null;
  return (current - previous) / previous;
}

function ownerLabel(user?: { firstName: string | null; lastName: string | null; email: string } | null) {
  if (!user) return null;
  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return name || user.email;
}

export async function getPlatformOverviewData(): Promise<PlatformOverviewData> {
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [
    tenantTotal,
    active,
    suspended,
    archived,
    fleet,
    station,
    platformUsers,
    tenantUsers,
    stations,
    organizations,
    clients,
    tenantsThisMonth,
    tenantsLastMonth,
    createdInWindow,
    usersInWindow,
    recent,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.tenant.count({ where: { status: "SUSPENDED" } }),
    prisma.tenant.count({ where: { status: "ARCHIVED" } }),
    prisma.tenant.count({ where: { activeModules: { has: "FLEET" } } }),
    prisma.tenant.count({ where: { activeModules: { has: "STATION" } } }),
    prisma.platformUser.count(),
    prisma.tenantUser.count(),
    prisma.station.count(),
    prisma.organization.count(),
    prisma.client.count(),
    prisma.tenant.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.tenant.count({
      where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } },
    }),
    prisma.tenant.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.tenantUser.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { createdAt: true },
    }),
    prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true,
        settingsJson: true,
        users: {
          where: { isOwner: true },
          take: 1,
          select: { firstName: true, lastName: true, email: true },
        },
      },
    }),
  ]);

  const tenantBuckets = new Map<string, number>();
  const userBuckets = new Map<string, number>();
  const monthly: MonthlyPoint[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    tenantBuckets.set(key, 0);
    userBuckets.set(key, 0);
    monthly.push({ key, label: monthLabel(key), tenants: 0, users: 0 });
  }

  for (const row of createdInWindow) {
    const key = monthKey(row.createdAt);
    if (tenantBuckets.has(key)) tenantBuckets.set(key, (tenantBuckets.get(key) ?? 0) + 1);
  }
  for (const row of usersInWindow) {
    const key = monthKey(row.createdAt);
    if (userBuckets.has(key)) userBuckets.set(key, (userBuckets.get(key) ?? 0) + 1);
  }
  for (const point of monthly) {
    point.tenants = tenantBuckets.get(point.key) ?? 0;
    point.users = userBuckets.get(point.key) ?? 0;
  }

  return {
    kpis: {
      tenants: tenantTotal,
      tenantChange: ratioChange(tenantsThisMonth, tenantsLastMonth),
      platformUsers,
      tenantUsers,
      stations,
    },
    counts: {
      organizations,
      clients,
      active,
      suspended,
      archived,
      fleet,
      station,
    },
    monthly,
    recentTenants: recent.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      logoUrl: resolveLogoUrl(parseTenantSettings(t.settingsJson).logoKey),
      ownerName: ownerLabel(t.users[0] ?? null),
      createdAt: t.createdAt.toISOString(),
    })),
  };
}
