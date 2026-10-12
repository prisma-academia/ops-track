import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ExpensesManager } from "./expenses-manager";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { orgStationBankAccountWhere } from "@/lib/bank-accounts/queries";
import { buildPctStats } from "@/components/tables";

function param(searchParams: { [key: string]: string | string[] | undefined }, key: string) {
  const value = searchParams[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function fmtMoney(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ExpensesPage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const actor = await requireTenantPage(PERMISSIONS.TENANT_EXPENSES_READ.key);

  const take = Math.max(1, parseInt(param(searchParams, "take") || "25", 10) || 25);
  const page = Math.max(1, parseInt(param(searchParams, "page") || "1", 10) || 1);
  const skip = (page - 1) * take;

  const activeOrgId = await resolveActiveOrgId(actor);
  const statusParam = param(searchParams, "status");
  const stationId = param(searchParams, "stationId");
  const category = param(searchParams, "category");
  const paymentMethod = param(searchParams, "paymentMethod");
  const amountMin = param(searchParams, "amountMin");
  const amountMax = param(searchParams, "amountMax");
  const dateStart = param(searchParams, "dateStart");
  const dateEnd = param(searchParams, "dateEnd");

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (dateStart) {
    const from = new Date(dateStart);
    from.setHours(0, 0, 0, 0);
    createdAt.gte = from;
  }
  if (dateEnd) {
    const to = new Date(dateEnd);
    to.setHours(23, 59, 59, 999);
    createdAt.lte = to;
  }

  const amount: { gte?: number; lte?: number } = {};
  if (amountMin) amount.gte = Number(amountMin);
  if (amountMax) amount.lte = Number(amountMax);

  const expenseWhere: Record<string, unknown> = {
    tenantId: actor.tenantId,
    context: "STATION",
    ...(statusParam && statusParam !== "ALL" ? { status: statusParam } : {}),
    ...(stationId ? { stationId } : {}),
    ...(category && category !== "ALL" ? { category } : {}),
    ...(paymentMethod && paymentMethod !== "ALL" ? { paymentMethod } : {}),
    ...(Object.keys(amount).length > 0 ? { amount } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
  };
  if (activeOrgId) {
    expenseWhere.station = { organizationId: activeOrgId };
  }

  const stationWhere: Record<string, unknown> = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const [totalCount, expenses, statusGroups, methodGroups, stations, bankAccounts] = await Promise.all([
    prisma.expense.count({ where: expenseWhere }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        bankAccount: true,
        recordedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.expense.groupBy({
      by: ["status"],
      where: expenseWhere,
      _count: { _all: true },
      _sum: { amount: true },
    }),
    prisma.expense.groupBy({
      by: ["paymentMethod"],
      where: expenseWhere,
      _sum: { amount: true },
    }),
    prisma.station.findMany({
      where: stationWhere,
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: orgStationBankAccountWhere({
        tenantId: actor.tenantId,
        organizationId: actor.organizationId ?? activeOrgId,
        isActive: true,
      }),
      select: {
        id: true,
        bankName: true,
        accountName: true,
        accountNumber: true,
      },
      orderBy: { bankName: "asc" },
    }),
  ]);

  const pendingAmount = Number(statusGroups.find((g) => g.status === "PENDING")?._sum.amount ?? 0);
  const approvedAmount = Number(statusGroups.find((g) => g.status === "APPROVED")?._sum.amount ?? 0);
  const totalAmount = statusGroups.reduce((sum, g) => sum + Number(g._sum.amount ?? 0), 0);
  const cashTotal = Number(methodGroups.find((g) => g.paymentMethod === "CASH")?._sum.amount ?? 0);

  const insightStats = buildPctStats([
    { key: "records", label: "Records", value: totalCount, color: "#475569" },
    {
      key: "total",
      label: "Total Expenses",
      value: totalAmount,
      color: "#f43f5e",
      format: (n) => fmtMoney(n),
    },
    {
      key: "pending",
      label: "Pending",
      value: pendingAmount,
      color: "#d97706",
      format: (n) => fmtMoney(n),
    },
    {
      key: "approved",
      label: "Approved",
      value: approvedAmount,
      color: "#10b981",
      format: (n) => fmtMoney(n),
    },
    {
      key: "cash",
      label: "Cash",
      value: cashTotal,
      color: "#6366f1",
      format: (n) => fmtMoney(n),
    },
  ]);

  const serializedExpenses = JSON.parse(JSON.stringify(expenses));
  const serializedStations = JSON.parse(JSON.stringify(stations));
  const serializedBankAccounts = JSON.parse(JSON.stringify(bankAccounts));

  const totalPages = Math.max(1, Math.ceil(totalCount / take));
  const initialMeta = {
    page,
    pageSize: take,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  return (
    <ExpensesManager
      initialExpenses={serializedExpenses}
      stations={serializedStations}
      bankAccounts={serializedBankAccounts}
      initialMeta={initialMeta}
      insightStats={insightStats}
    />
  );
}
