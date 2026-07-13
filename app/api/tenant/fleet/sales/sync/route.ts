import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const sales = await prisma.sale.findMany({
      where: {
        litersReceived: null,
        stationId: { not: null },
      },
    });

    let updatedCount = 0;

    for (const sale of sales) {
      const allocation = await prisma.waybillAllocation.findFirst({
        where: {
          stationId: sale.stationId as string,
          litersToDispense: sale.litersDespatched,
          status: "DELIVERED",
        },
        orderBy: { createdAt: 'desc' }
      });

      if (allocation && allocation.litersReceived !== null) {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { litersReceived: allocation.litersReceived }
        });
        updatedCount++;
      }
    }

    return NextResponse.json({ success: true, count: updatedCount, totalFound: sales.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
