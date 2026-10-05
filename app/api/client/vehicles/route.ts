import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireClientActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const CreateVehicleSchema = z.object({
  plateNumber: z.string().min(2).max(20).transform((v) => v.toUpperCase().trim()),
  makeModel: z.string().max(100).optional().nullable(),
  fuelType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  tankCapacity: z.number().positive().max(5000),
  dailyLimitLiters: z.number().positive().optional().nullable(),
});

export async function GET() {
  try {
    const actor = await requireClientActor();
    const vehicles = await prisma.clientVehicle.findMany({
      where: { clientId: actor.clientId, tenantId: actor.tenantId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return ok({ vehicles });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireClientActor();
    const body = CreateVehicleSchema.parse(await request.json());

    const existing = await prisma.clientVehicle.findUnique({
      where: {
        tenantId_clientId_plateNumber: {
          tenantId: actor.tenantId,
          clientId: actor.clientId,
          plateNumber: body.plateNumber,
        },
      },
    });

    if (existing) {
      if (!existing.isActive) {
        const reactivated = await prisma.clientVehicle.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            makeModel: body.makeModel ?? null,
            fuelType: body.fuelType,
            tankCapacity: body.tankCapacity,
            dailyLimitLiters: body.dailyLimitLiters ?? null,
          },
        });
        return ok({ vehicle: reactivated });
      }
      throw new DomainError(409, "vehicle_exists", `Plate number ${body.plateNumber} already exists in your fleet.`);
    }

    const vehicle = await prisma.clientVehicle.create({
      data: {
        tenantId: actor.tenantId,
        clientId: actor.clientId,
        plateNumber: body.plateNumber,
        makeModel: body.makeModel ?? null,
        fuelType: body.fuelType,
        tankCapacity: body.tankCapacity,
        dailyLimitLiters: body.dailyLimitLiters ?? null,
      },
    });

    return ok({ vehicle });
  } catch (e) {
    return handleError(e);
  }
}
