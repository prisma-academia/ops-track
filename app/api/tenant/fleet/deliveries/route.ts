import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";
import { fleetModuleFilter } from "@/lib/auth/org-scope";

const CreateSaleSchema = z.object({
  recipientType: z.enum(["CUSTOMER", "STATION"]),
  customerId: z.string().optional(),
  stationId: z.string().optional(),
  transportCostBorneBy: z.enum(["CLIENT", "COMPANY"]).optional(),
  transportId: z.string().min(1, "Transport is required"),
  litersDespatched: z.number().positive(),
  litersReceived: z.number().min(0).optional().nullable(),
  amountPerLiter: z.number().positive(),
  transportCostPerLiter: z.number().min(0).optional().default(0),
}).superRefine((data, ctx) => {
  if (data.recipientType === "CUSTOMER" && !data.customerId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a customer", path: ["customerId"] });
  }
  if (data.recipientType === "STATION" && !data.stationId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Please select a station", path: ["stationId"] });
  }
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const status = url.searchParams.get("status");

    const rows = await prisma.delivery.findMany({
      where: {
        tenantId: actor.tenantId,
        ...fleetModuleFilter(actor),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        customer: { select: { id: true, name: true } },
        station: { select: { id: true, name: true } },
        transport: {
          select: {
            id: true,
            truck: { select: { id: true, name: true } },
            transporter: { select: { id: true, name: true } },
          },
        },
      },
    });

    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_WRITE.key);
    const body = CreateSaleSchema.parse(await request.json());
    const meta = requestMeta(request);

    // XOR validation
    if (body.customerId && body.stationId) {
      throw new DomainError(400, "invalid_input", "A Delivery cannot belong to both a customer and a station.");
    }

    // null = not yet received (will be set after dipping). 0 is a valid received value.
    const litersReceivedForCalc = body.litersReceived !== undefined && body.litersReceived !== null ? body.litersReceived : body.litersDespatched;
    const totalExpectedAmount = litersReceivedForCalc * body.amountPerLiter;
    
    // Default transport cost rule if not provided (Company for own station, Client for external)
    let transportCostBorneBy = body.transportCostBorneBy;
    if (!transportCostBorneBy) {
      transportCostBorneBy = body.stationId ? "COMPANY" : "CLIENT";
    }

    const Delivery = await prisma.$transaction(async (tx) => {
      let organizationId: string | null = null;
      if (body.stationId) {
        const station = await tx.station.findUnique({
          where: { id: body.stationId },
          select: { organizationId: true }
        });
        organizationId = station?.organizationId ?? null;
      }

      const s = await tx.delivery.create({
        data: {
          tenantId: actor.tenantId,
          organizationId: organizationId,
          customerId: body.customerId ?? null,
          stationId: body.stationId ?? null,
          transportId: body.transportId ?? null,
          transportCostBorneBy: transportCostBorneBy,
          transportRate: body.transportCostPerLiter ?? 0,
          transportCost: (body.transportCostPerLiter ?? 0) * body.litersDespatched,
          litersDespatched: body.litersDespatched,
          litersReceived: body.litersReceived ?? null,
          amountPerLiter: body.amountPerLiter,
          totalExpectedAmount,
        },
        include: {
          customer: { select: { id: true, name: true } },
          station: { select: { id: true, name: true } }
        },
      });

      // Auto-generate Waybill if this distribution targets a station and comes from a transport
      if (s.stationId && s.transportId) {
        const t = await tx.transport.findUnique({
          where: { id: s.transportId },
          include: {
            truck: true,
            driver: true,
            transporter: true,
            order: true,
          }
        });

        if (t) {
          const station = await tx.station.findUnique({
            where: { id: s.stationId },
            select: { code: true, name: true }
          });
          const rawCode = station ? station.code : "DISP";
          const prefix = rawCode.replace(/-?\d+$/, "");
          const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
          const randomNum = Math.floor(Math.random() * 900) + 100;
          const wbNumber = `WB-${prefix}-${today}-${t.productType ?? "PMS"}-${randomNum}`;

          await tx.waybill.create({
            data: {
              tenantId: actor.tenantId,
              number: wbNumber,
              productType: (t.productType as any) ?? "PMS",
              litersLoaded: s.litersDespatched,
              truckPlate: t.truck?.plateNumber || t.truck?.name || "N/A",
              driverName: t.driver ? `${t.driver.firstName} ${t.driver.lastName}` : "Unknown Driver",
              driverPhone: t.driver?.phone ?? null,
              supplier: t.order?.supplier || "Fleet Management",
              transportCompany: t.transporter?.name ?? null,
              recordedById: actor.userId,
              allocations: {
                create: [{
                  tenantId: actor.tenantId,
                  stationId: s.stationId,
                  deliveryId: s.id,
                  litersToDispense: s.litersDespatched,
                  costPerLiter: s.amountPerLiter,
                  transportationCost: (body.transportCostPerLiter ?? 0) * body.litersDespatched,
                }]
              }
            }
          });
        }
      }
      return s;
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "fleet_delivery.create",
      tenantId: actor.tenantId,
      targetType: "Delivery",
      targetId: Delivery.id,
      after: {
        amount: Delivery.totalExpectedAmount,
        liters: Delivery.litersDespatched,
        target: Delivery.station?.name || Delivery.customer?.name || "Unknown",
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ Delivery });
  } catch (e) {
    return handleError(e);
  }
}
