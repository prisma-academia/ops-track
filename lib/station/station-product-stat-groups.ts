import { formatShortCurrency } from "@/lib/utils";
import type { FleetStatGroup } from "@/app/admin/(fleet)/types";

export const STATION_PRODUCT_TYPES = ["PMS", "AGO", "DPK", "LPG"] as const;

export type StationProductStats = {
  stockLiters: Record<string, number>;
  salesRevenue: Record<string, number>;
  outstockLiters: Record<string, number>;
};

const PRODUCT_ACCENTS: FleetStatGroup["accent"][] = ["blue", "amber", "violet", "emerald"];

function formatLitersFull(n: number) {
  return `${n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} L`;
}

function formatNairaFull(n: number) {
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function emptyStationProductStats(): StationProductStats {
  const empty = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 };
  return {
    stockLiters: { ...empty },
    salesRevenue: { ...empty },
    outstockLiters: { ...empty },
  };
}

export function buildStationProductStatGroups(
  products: StationProductStats,
  hint: string
): FleetStatGroup[] {
  return STATION_PRODUCT_TYPES.map((productType, index) => {
    const stock = products.stockLiters[productType] ?? 0;
    const revenue = products.salesRevenue[productType] ?? 0;
    const outstock = products.outstockLiters[productType] ?? 0;

    return {
      id: `station-product-${productType}`,
      title: productType,
      accent: PRODUCT_ACCENTS[index % PRODUCT_ACCENTS.length],
      headerIcon: "volume",
      hint,
      metrics: [
        {
          label: "Stock",
          icon: "ordered",
          value: `${stock.toLocaleString()} L`,
          tooltip: formatLitersFull(stock),
        },
        {
          label: "Sales",
          icon: "collected",
          value: formatShortCurrency(revenue),
          tooltip: formatNairaFull(revenue),
        },
        {
          label: "Outstock",
          icon: "sold",
          value: `${outstock.toLocaleString()} L`,
          tooltip: `${formatLitersFull(outstock)} sold in period`,
        },
      ],
    };
  });
}

export function mergeSalesGroupBy(
  rows: {
    productType: string;
    _sum: { amountPos: unknown; amountTransfer: unknown; litersSold: unknown };
  }[]
): Pick<StationProductStats, "salesRevenue" | "outstockLiters"> {
  const salesRevenue = emptyStationProductStats().salesRevenue;
  const outstockLiters = emptyStationProductStats().outstockLiters;

  for (const row of rows) {
    const pt = row.productType;
    if (!(pt in salesRevenue)) continue;
    salesRevenue[pt] +=
      Number(row._sum.amountPos || 0) + Number(row._sum.amountTransfer || 0);
    outstockLiters[pt] += Number(row._sum.litersSold || 0);
  }

  return { salesRevenue, outstockLiters };
}
