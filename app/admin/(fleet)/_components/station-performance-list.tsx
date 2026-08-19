import { cn, formatShortCurrency } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { StationPerformanceData } from "../types";

const avatarColor = [
  "border-yellow-400 dark:border-yellow-500 text-yellow-600 dark:text-yellow-400",
  "border-gray-300 dark:border-gray-400 text-gray-600 dark:text-gray-300",
  "border-amber-600 dark:border-amber-700 text-amber-600 dark:text-amber-500",
];

const badgeColor = [
  "bg-yellow-400 dark:bg-yellow-500",
  "bg-gray-300 dark:bg-gray-400",
  "bg-amber-600 dark:bg-amber-700",
];

const STATION_ICON = "/assets/icons/gps.png";

function formatSaleLabel(station: StationPerformanceData) {
  if (!station.lastSales) return "—";
  return `${formatShortCurrency(station.lastSales.amount)} · ${station.lastSales.liters.toLocaleString()} L`;
}

function formatStockLabel(station: StationPerformanceData) {
  if (!station.lastClosingStock) return "—";
  return `${station.lastClosingStock.liters.toLocaleString()} L`;
}

function StationPerformanceRow({
  station,
  index,
  isTop3,
}: {
  station: StationPerformanceData;
  index: number;
  isTop3: boolean;
}) {
  return (
    <Card className={isTop3 ? "py-2" : undefined}>
      <CardContent className="flex items-center gap-x-3 py-2 px-4">
        <div className="relative shrink-0">
          <Avatar
            className={cn(
              "border-2 bg-transparent rounded-md size-12 after:hidden",
              isTop3 ? avatarColor[index] : "border-muted text-muted-foreground"
            )}
          >
            <AvatarImage src={STATION_ICON} alt={station.name} className="object-contain p-2 rounded-md" />
            <AvatarFallback className="bg-transparent font-bold rounded-md">
              {station.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
              isTop3 ? cn("text-foreground", badgeColor[index]) : "bg-muted text-muted-foreground"
            )}
          >
            {index + 1}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate">{station.name}</h3>
          <p className="text-xs text-muted-foreground font-semibold truncate">
            {station.trips} deliveries
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-xs border-l border-border/50 pl-3">
          <div className="min-w-0">
            <span className="text-muted-foreground">Sale </span>
            <span className="font-semibold">{formatSaleLabel(station)}</span>
          </div>
          <div className="min-w-0">
            <span className="text-muted-foreground">Stock </span>
            <span className="font-semibold">{formatStockLabel(station)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={cn("text-sm font-semibold", !isTop3 && "text-muted-foreground")}>
            {formatShortCurrency(station.amount)}
          </span>
          <Badge
            className={cn(
              "shadow-none rounded-sm",
              !isTop3 && "bg-muted text-muted-foreground hover:bg-muted"
            )}
          >
            {station.volume.toLocaleString()} L
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function StationPerformanceList({ data }: { data: StationPerformanceData[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No station activity for this period.
      </p>
    );
  }

  const top3 = data.slice(0, 3);
  const others = data.slice(3);

  return (
    <ul className="space-y-2 mt-4">
      {top3.map((station, index) => (
        <li key={station.name + index}>
          <StationPerformanceRow station={station} index={index} isTop3 />
        </li>
      ))}
      {others.map((station, index) => (
        <li key={station.name + index}>
          <StationPerformanceRow station={station} index={index + 3} isTop3={false} />
        </li>
      ))}
    </ul>
  );
}
