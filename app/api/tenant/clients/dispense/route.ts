import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const DispenseSchema = z.object({
  stationId: z.string().min(1),
  clientId: z.string().min(1),
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  liters: z.number().positive(),
  pricePerLiter: z.number().positive(),
  odometerReading: z.number().nonnegative().optional().nullable(),
  driverPhotoUrl: z.string().url().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_WRITE.key);
    const body = DispenseSchema.parse(await request.json());
    const meta = requestMeta(request);

    // 1. Verify Client Station Access
    const access = await prisma.clientStationAccess.findUnique({
      where: {
        clientId_stationId: {
          clientId: body.clientId,
          stationId: body.stationId,
        },
      },
      include: {
        client: true,
        station: true,
      },
    });

    if (!access || access.tenantId !== actor.tenantId) {
      throw new DomainError(
        403,
        "branch_not_allowed",
        "This corporate client is not authorized to collect fuel from this station branch."
      );
    }

    const client = access.client;
    if (client.status !== "ACTIVE") {
      throw new DomainError(400, "client_inactive", "Client account is suspended or inactive.");
    }

    // 2. Verify Vehicle
    const vehicle = await prisma.clientVehicle.findUnique({
      where: { id: body.vehicleId },
    });
    if (!vehicle || vehicle.clientId !== body.clientId || !vehicle.isActive) {
      throw new DomainError(400, "invalid_vehicle", "Vehicle is invalid or inactive for this client.");
    }

    if (vehicle.fuelType !== body.productType) {
      throw new DomainError(
        400,
        "product_mismatch",
        `Product type mismatch: vehicle requires ${vehicle.fuelType}, but ${body.productType} was selected.`
      );
    }

    // Fraud prevention: Tank Capacity Check
    if (body.liters > Number(vehicle.tankCapacity)) {
      throw new DomainError(
        400,
        "exceeds_tank_capacity",
        `Requested ${body.liters} Liters exceeds vehicle tank maximum capacity of ${vehicle.tankCapacity} Liters.`
      );
    }

    // Daily Limit Check
    if (vehicle.dailyLimitLiters) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayOrders = await prisma.clientFuelOrder.aggregate({
        where: {
          vehicleId: vehicle.id,
          createdAt: { gte: todayStart },
          status: "DISPENSED",
        },
        _sum: { liters: true },
      });

      const todayLiters = Number(todayOrders._sum.liters || 0);
      if (todayLiters + body.liters > Number(vehicle.dailyLimitLiters)) {
        throw new DomainError(
          400,
          "daily_limit_exceeded",
          `Vehicle has reached its daily limit of ${vehicle.dailyLimitLiters} Liters (${todayLiters} L dispensed today).`
        );
      }
    }

    // 3. Verify Driver
    const driver = await prisma.clientDriver.findUnique({
      where: { id: body.driverId },
    });
    if (!driver || driver.clientId !== body.clientId || !driver.isActive) {
      throw new DomainError(400, "invalid_driver", "Driver is invalid or inactive for this client.");
    }

    // 4. Financial Calculations & Solvency Checks
    const totalAmount = Number((body.liters * body.pricePerLiter).toFixed(2));
    const depositBalance = Number(client.depositBalance);
    const outstandingDebt = Number(client.outstandingDebt);
    const creditLimit = Number(client.creditLimit);

    if (client.billingModel === "PREPAID") {
      if (depositBalance < totalAmount) {
        throw new DomainError(
          402,
          "insufficient_deposit",
          `Insufficient prepaid balance. Available: ₦${depositBalance.toLocaleString()}, Required: ₦${totalAmount.toLocaleString()}.`
        );
      }
    } else {
      // POSTPAID
      if (outstandingDebt + totalAmount > creditLimit) {
        const availableCredit = creditLimit - outstandingDebt;
        throw new DomainError(
          402,
          "credit_limit_exceeded",
          `Credit limit exceeded. Available credit: ₦${availableCredit.toLocaleString()}, Order amount: ₦${totalAmount.toLocaleString()}.`
        );
      }
    }

    // 5. Execute Atomic Transaction (Order + Financial Ledger + Balance Update)
    const result = await prisma.$transaction(async (tx) => {
      // Create the Fuel Order
      const order = await tx.clientFuelOrder.create({
        data: {
          tenantId: actor.tenantId,
          stationId: body.stationId,
          clientId: body.clientId,
          vehicleId: body.vehicleId,
          driverId: body.driverId,
          productType: body.productType,
          liters: body.liters,
          pricePerLiter: body.pricePerLiter,
          totalAmount,
          managerId: actor.userId,
          status: "DISPENSED",
          odometerReading: body.odometerReading ?? null,
          driverPhotoUrl: body.driverPhotoUrl ?? null,
          notes: body.notes ?? null,
        },
      });

      // Update Client Balance & Write Ledger
      let balanceBefore = 0;
      let balanceAfter = 0;

      if (client.billingModel === "PREPAID") {
        balanceBefore = depositBalance;
        balanceAfter = Number((depositBalance - totalAmount).toFixed(2));

        await tx.client.update({
          where: { id: client.id },
          data: { depositBalance: balanceAfter },
        });

        await tx.clientWalletLedger.create({
          data: {
            tenantId: actor.tenantId,
            clientId: client.id,
            type: "FUEL_DISPENSE",
            amount: totalAmount,
            balanceBefore,
            balanceAfter,
            reference: order.id,
            description: `${body.liters}L ${body.productType} @ ₦${body.pricePerLiter}/L dispensed to ${vehicle.plateNumber} at ${access.station.name}`,
          },
        });
      } else {
        // POSTPAID
        balanceBefore = outstandingDebt;
        balanceAfter = Number((outstandingDebt + totalAmount).toFixed(2));

        await tx.client.update({
          where: { id: client.id },
          data: { outstandingDebt: balanceAfter },
        });

        await tx.clientWalletLedger.create({
          data: {
            tenantId: actor.tenantId,
            clientId: client.id,
            type: "FUEL_DISPENSE",
            amount: totalAmount,
            balanceBefore,
            balanceAfter,
            reference: order.id,
            description: `${body.liters}L ${body.productType} @ ₦${body.pricePerLiter}/L dispensed to ${vehicle.plateNumber} on credit at ${access.station.name}`,
          },
        });
      }

      return { order, balanceAfter };
    });

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "client.fuel_order.dispense",
      tenantId: actor.tenantId,
      targetType: "ClientFuelOrder",
      targetId: result.order.id,
      after: {
        clientId: client.id,
        vehiclePlate: vehicle.plateNumber,
        driverName: driver.fullName,
        liters: body.liters,
        totalAmount,
        managerId: actor.userId,
      } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({
      order: result.order,
      billingModel: client.billingModel,
      newBalance: result.balanceAfter,
    });
  } catch (e) {
    return handleError(e);
  }
}
