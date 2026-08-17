import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const Deliveries = await prisma.delivery.findMany({
      where: {
        litersReceived: null,
        stationId: { not: null },
      },
    });

    let updatedCount = 0;

    for (const Delivery of Deliveries) {
      const allocation = await prisma.waybillAllocation.findFirst({
        where: {
          stationId: Delivery.stationId as string,
          litersToDispense: Delivery.litersDespatched,
          status: "DELIVERED",
        },
        orderBy: { createdAt: 'desc' }
      });

      if (allocation && allocation.litersReceived !== null) {
        await prisma.delivery.update({
          where: { id: Delivery.id },
          data: { litersReceived: allocation.litersReceived }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, count: updatedCount, totalFound: Deliveries.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
