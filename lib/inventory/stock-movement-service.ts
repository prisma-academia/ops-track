import { Prisma, StockMovementType, ProductType } from "@/lib/generated/prisma/client";

/**
 * Shared interface for creating a stock movement.
 */
export interface CreateStockMovementParams {
  tenantId: string;
  stationId: string;
  tankId: string;
  productType: ProductType;
  quantity: Prisma.Decimal | number | string;
  referenceId?: string;
  notes?: string;
  recordedById?: string;
}

export interface ExecuteStockMovementOptions {
  /** When false, log the movement but leave tank.currentLiters unchanged. */
  applyToTank?: boolean;
}

/**
 * Creates a stock movement record AND updates the tank's current liters
 * in a single transaction.
 */
async function executeStockMovement(
  tx: Prisma.TransactionClient,
  type: StockMovementType,
  params: CreateStockMovementParams,
  referenceType: string,
  options?: ExecuteStockMovementOptions
) {
  const applyToTank = options?.applyToTank !== false;

  // 1. Get current tank balance
  const tank = await tx.tank.findFirstOrThrow({
    where: {
      id: params.tankId,
      tenantId: params.tenantId,
      stationId: params.stationId,
    },
    select: { id: true, currentLiters: true },
  });

  // 2. Calculate new balance. Treat a phantom negative book figure as 0 so a
  // delivery cannot be added onto a double-counted sales decrement.
  const quantity = new Prisma.Decimal(params.quantity);
  const starting = tank.currentLiters.lt(0) ? new Prisma.Decimal(0) : tank.currentLiters;
  let balanceAfter = starting.add(quantity);
  if (balanceAfter.lt(0)) {
    balanceAfter = new Prisma.Decimal(0);
  }

  // 3. Create the movement log
  const movement = await tx.stockMovement.create({
    data: {
      tenantId: params.tenantId,
      stationId: params.stationId,
      tankId: params.tankId,
      movementType: type,
      productType: params.productType,
      quantity: quantity,
      balanceAfter: applyToTank ? balanceAfter : starting,
      referenceId: params.referenceId,
      referenceType: referenceType,
      notes: params.notes,
      recordedById: params.recordedById,
    },
  });

  // 4. Update the actual tank level
  if (applyToTank) {
    await tx.tank.update({
      where: { id: tank.id },
      data: {
        currentLiters: balanceAfter,
      },
    });
  }

  return movement;
}

/**
 * Service to manage Station Stock (Inventory).
 * All fuel additions or subtractions MUST go through these functions.
 */
export const StockMovementService = {
  
  async recordDeliveryDrop(tx: Prisma.TransactionClient, params: CreateStockMovementParams) {
    // Deliveries add to the tank
    return executeStockMovement(tx, StockMovementType.DELIVERY, {
      ...params,
      quantity: new Prisma.Decimal(params.quantity).abs(), // Ensure positive
    }, "Delivery");
  },

  async recordRetailSale(
    tx: Prisma.TransactionClient,
    params: CreateStockMovementParams,
    options?: ExecuteStockMovementOptions
  ) {
    // Sales reports are financial. Tank volume is already set by dipping (and
    // adjusted by shifts / waybills). Applying this decrement a second time
    // is what produced negative currentLiters.
    return executeStockMovement(tx, StockMovementType.SALE, {
      ...params,
      quantity: new Prisma.Decimal(params.quantity).abs().negated(), // Ensure negative
    }, "RetailSale", { applyToTank: options?.applyToTank ?? false });
  },

  async recordAdjustment(tx: Prisma.TransactionClient, params: CreateStockMovementParams) {
    // Adjustments can be positive or negative
    return executeStockMovement(tx, StockMovementType.ADJUSTMENT, params, "Adjustment");
  },

  async recordLoss(tx: Prisma.TransactionClient, params: CreateStockMovementParams) {
    // Loss removes from the tank
    return executeStockMovement(tx, StockMovementType.LOSS, {
      ...params,
      quantity: new Prisma.Decimal(params.quantity).abs().negated(), // Ensure negative
    }, "Loss");
  },

  async recordOpeningBalance(tx: Prisma.TransactionClient, params: CreateStockMovementParams) {
    return executeStockMovement(tx, StockMovementType.OPENING_BALANCE, params, "OpeningBalance");
  }
};
