import type { Prisma } from "@/lib/generated/prisma/client";

type OrderWithTransports = {
  litersOrdered: Prisma.Decimal | number | string;
  transports: { litersCarried: Prisma.Decimal | number | string }[];
};

type OrderLookupClient = {
  order: {
    findUnique(args: {
      where: { id: string; tenantId: string };
      include: {
        transports: {
          where: {
            status: { not: "CANCELLED" };
            id?: { not: string };
          };
          select: { litersCarried: true };
        };
      };
    }): Promise<OrderWithTransports | null>;
  };
};

export function validateOrderDispatchCapacity(
  order: OrderWithTransports,
  newLiters: number
): void {
  const existingLiters = order.transports.reduce(
    (sum, t) => sum + Number(t.litersCarried),
    0
  );
  if (existingLiters + newLiters > Number(order.litersOrdered)) {
    throw new Error("Total dispatched liters cannot exceed the ordered quantity.");
  }
}

export async function assertOrderLinkCapacity(
  tx: OrderLookupClient,
  tenantId: string,
  orderId: string,
  litersToAdd: number,
  excludeTransportId?: string
) {
  const order = await tx.order.findUnique({
    where: { id: orderId, tenantId },
    include: {
      transports: {
        where: {
          status: { not: "CANCELLED" },
          ...(excludeTransportId ? { id: { not: excludeTransportId } } : {}),
        },
        select: { litersCarried: true },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  validateOrderDispatchCapacity(order, litersToAdd);
  return order;
}

/** Bridge extended Prisma clients to {@link OrderLookupClient}. */
export function asOrderLookupClient(
  client: unknown
): OrderLookupClient {
  return client as OrderLookupClient;
}
