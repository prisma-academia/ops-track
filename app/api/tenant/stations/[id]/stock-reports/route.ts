import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";
import { Prisma } from "@/lib/generated/prisma/client";

const CreateStockReportSchema = z.object({
  reportDate: z.string().transform((v) => new Date(v)),
  openingStockPms: z.coerce.number().nonnegative().default(0),
  openingStockAgo: z.coerce.number().nonnegative().default(0),
  openingStockDpk: z.coerce.number().nonnegative().default(0),
  soldPms: z.coerce.number().nonnegative().default(0),
  soldAgo: z.coerce.number().nonnegative().default(0),
  soldDpk: z.coerce.number().nonnegative().default(0),
  dippings: z.array(
    z.object({
      tankId: z.string().min(1),
      shift: z.enum(["MORNING", "EVENING"]),
      dippingLiters: z.coerce.number().nonnegative(),
    })
  ).default([]),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const reports = await prisma.dailyStockReport.findMany({
      where: { stationId, tenantId: actor.tenantId },
      orderBy: { reportDate: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        tankDippings: {
          include: {
            tank: {
              select: {
                id: true,
                name: true,
                productType: true,
              },
            },
          },
        },
      },
    });

    return ok(reports, buildPageMeta(reports, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_DIPPINGS_WRITE.key);
    const body = CreateStockReportSchema.parse(await request.json());
    const meta = requestMeta(request);

    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    // Verify all dipped tanks belong to this station
    if (body.dippings.length > 0) {
      const tankIds = body.dippings.map((d) => d.tankId);
      const tanks = await prisma.tank.findMany({
        where: {
          id: { in: tankIds },
          stationId,
          tenantId: actor.tenantId,
        },
      });
      if (tanks.length !== new Set(tankIds).size) {
        throw new DomainError(400, "invalid_tanks", "One or more dippings contain tanks that do not exist or belong to another station.");
      }
    }

    // Execute writing DailyStockReport and nested TankDippings in a transaction
    try {
      const result = await prisma.$transaction(async (tx) => {
        const report = await tx.dailyStockReport.create({
          data: {
            tenantId: actor.tenantId,
            stationId,
            reportDate: body.reportDate,
            openingStockPms: body.openingStockPms,
            openingStockAgo: body.openingStockAgo,
            openingStockDpk: body.openingStockDpk,
            soldPms: body.soldPms,
            soldAgo: body.soldAgo,
            soldDpk: body.soldDpk,
          },
        });

        const dippingsData = body.dippings.map((d) => ({
          tenantId: actor.tenantId,
          dailyStockReportId: report.id,
          tankId: d.tankId,
          shift: d.shift,
          dippingLiters: d.dippingLiters,
        }));

        if (dippingsData.length > 0) {
          await tx.tankDipping.createMany({
            data: dippingsData,
          });
        }

        const fullReport = await tx.dailyStockReport.findUnique({
          where: { id: report.id },
          include: { tankDippings: true },
        });

        return fullReport;
      });

      await audit({
        actorType: "TENANT_USER",
        actorId: actor.userId,
        action: "stock_report.create",
        tenantId: actor.tenantId,
        targetType: "DailyStockReport",
        targetId: result?.id ?? "",
        after: {
          reportDate: body.reportDate,
          dippingsRecorded: body.dippings.length,
        } as object,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      return ok({ report: result });
    } catch (txError) {
      if (txError instanceof Prisma.PrismaClientKnownRequestError && txError.code === "P2002") {
        throw new DomainError(409, "report_exists", "A stock report already exists for this station on the selected date.");
      }
      throw txError;
    }
  } catch (e) {
    return handleError(e);
  }
}
