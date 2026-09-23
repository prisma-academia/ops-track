import React, { useId } from "react";
import { Cylinder, Droplets, Gauge, Moon, Package, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AssetTankProps {
  currentLitres: number;
  maxCapacity: number;
  label?: string;
  type?: "fuel" | "gas";
  lossDeduction?: number;
  lossLitres?: number;
  waterLevel?: number | null;
  temperature?: number | null;
  lastClosingDip?: number | null;
  lastClosingAt?: string | null;
  variant?: "default" | "compact";
  layout?: "station" | "fleet";
  productLabel?: string | null;
  rightSide?: React.ReactNode;
  className?: string;
}

type StatRow = {
  icon: typeof Gauge;
  label: string;
  value: string;
  valueClass?: string;
  hint?: string | null;
};

function fmtVolume(n: number, unit: string) {
  return `${n.toLocaleString("en-NG", { maximumFractionDigits: 2 })} ${unit}`;
}

function StatsCard({ rows }: { rows: StatRow[] }) {
  return (
    <div className="w-full rounded-lg bg-muted/60 dark:bg-muted/40 border border-border/70 overflow-hidden">
      {rows.map((row, index) => {
        const Icon = row.icon;
        return (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2",
              index > 0 && "border-t border-border/70"
            )}
          >
            <span className="flex items-center gap-2 min-w-0 text-[11px] text-muted-foreground">
              <span className="size-6 rounded-md bg-background/80 border border-border/60 flex items-center justify-center shrink-0">
                <Icon className="size-3.5" />
              </span>
              <span className="truncate">{row.label}</span>
            </span>
            <span className="text-right min-w-0">
              <span className={cn("block font-mono text-[11px] font-semibold text-foreground", row.valueClass)}>
                {row.value}
              </span>
              {row.hint ? (
                <span className="block text-[9px] text-muted-foreground truncate">{row.hint}</span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const AssetTank: React.FC<AssetTankProps> = ({
  currentLitres,
  maxCapacity,
  label = "Asset Storage Tank",
  type = "fuel",
  lossDeduction,
  lossLitres,
  waterLevel,
  temperature,
  lastClosingDip,
  lastClosingAt,
  variant = "default",
  layout = "station",
  rightSide,
  className,
}) => {
  const uid = useId().replace(/:/g, "");
  const unit = type === "gas" ? "KG" : "L";
  const safeLitres = Number.isFinite(currentLitres) ? Math.max(0, currentLitres) : 0;
  const percentage = maxCapacity > 0 ? Math.min(Math.max((safeLitres / maxCapacity) * 100, 0), 100) : 0;
  const isCompact = variant === "compact";
  const isFleet = layout === "fleet";

  let liquidColor = `url(#liquid-green-${uid})`;
  let textThemeColor = "text-emerald-600 dark:text-emerald-400";
  let badgeStyle = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
  let statusLabel = "SAFE";

  if (percentage <= 20) {
    liquidColor = `url(#liquid-red-${uid})`;
    textThemeColor = "text-rose-600 dark:text-rose-400";
    badgeStyle = "bg-rose-500/10 text-rose-500 border-rose-500/20";
    statusLabel = "CRITICAL";
  } else if (percentage <= 50) {
    liquidColor = `url(#liquid-amber-${uid})`;
    textThemeColor = "text-amber-600 dark:text-amber-500";
    badgeStyle = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    statusLabel = "LOW";
  }

  const stationStats: StatRow[] = [
    { icon: Gauge, label: "Level", value: fmtVolume(safeLitres, unit), valueClass: textThemeColor },
    { icon: Cylinder, label: "Capacity", value: fmtVolume(maxCapacity, unit) },
    { icon: Droplets, label: "Water level", value: waterLevel == null ? "—" : fmtVolume(Number(waterLevel), unit) },
    { icon: Thermometer, label: "Temperature", value: temperature == null ? "—" : `${Number(temperature).toLocaleString()}°C` },
    {
      icon: Moon,
      label: "Last closing dip",
      value: lastClosingDip == null ? "—" : fmtVolume(Number(lastClosingDip), unit),
      hint: lastClosingAt,
    },
  ];

  if (lossLitres !== undefined && lossLitres > 0) {
    stationStats.push({
      icon: Droplets,
      label: "Loss volume",
      value: fmtVolume(lossLitres, unit),
      valueClass: "text-rose-600 dark:text-rose-400",
    });
  } else if (lossDeduction !== undefined && lossDeduction > 0) {
    stationStats.push({
      icon: Droplets,
      label: "Loss deduction",
      value: `₦${lossDeduction.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      valueClass: "text-rose-600 dark:text-rose-400",
    });
  }

  const fleetStats: StatRow[] = [
    { icon: Cylinder, label: "Capacity", value: fmtVolume(maxCapacity, unit) },
    { icon: Package, label: "Loaded amount", value: fmtVolume(safeLitres, unit), valueClass: textThemeColor },
    { icon: Droplets, label: "Water level", value: fmtVolume(0, unit) },
  ];

  const defs = (
    <defs>
      <linearGradient id={`shell-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#64748b" stopOpacity="0.95" />
        <stop offset="35%" stopColor="#cbd5e1" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#475569" stopOpacity="0.95" />
      </linearGradient>
      <linearGradient id={`shell-v-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#64748b" stopOpacity="0.95" />
        <stop offset="45%" stopColor="#e2e8f0" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#475569" stopOpacity="0.95" />
      </linearGradient>
      <linearGradient id={`shell-inner-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#0f172a" stopOpacity="0.16" />
      </linearGradient>
      <linearGradient id={`liquid-green-${uid}`} x1="0%" y1="0%" x2={isFleet ? "100%" : "0%"} y2={isFleet ? "0%" : "100%"}>
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="55%" stopColor="#10b981" />
        <stop offset="100%" stopColor="#065f46" />
      </linearGradient>
      <linearGradient id={`liquid-amber-${uid}`} x1="0%" y1="0%" x2={isFleet ? "100%" : "0%"} y2={isFleet ? "0%" : "100%"}>
        <stop offset="0%" stopColor="#fbbf24" />
        <stop offset="55%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#92400e" />
      </linearGradient>
      <linearGradient id={`liquid-red-${uid}`} x1="0%" y1="0%" x2={isFleet ? "100%" : "0%"} y2={isFleet ? "0%" : "100%"}>
        <stop offset="0%" stopColor="#f87171" />
        <stop offset="55%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#991b1b" />
      </linearGradient>
    </defs>
  );

  const stationHull = "M 58 36 A 52 14 0 0 1 162 36 L 162 186 A 52 14 0 0 1 58 186 Z";
  const fleetHull = "M 56 40 H 280 A 48 48 0 0 1 280 136 H 56 A 48 48 0 0 1 56 40 Z";

  const StationSvg = (
    <svg viewBox="0 0 220 210" className={cn("w-full drop-shadow-md", isCompact ? "max-h-40" : "max-h-44")} aria-hidden>
      {defs}
      <clipPath id={`tank-clip-${uid}`}>
        <path d={stationHull} />
      </clipPath>

      <path d={stationHull} fill={`url(#shell-v-${uid})`} stroke="#64748b" strokeWidth="1.8" />
      <path d={stationHull} fill={`url(#shell-inner-${uid})`} />

      {percentage > 0 && (
        <g clipPath={`url(#tank-clip-${uid})`}>
          <g style={{ transform: `translateY(${((100 - percentage) / 100) * 150}px)` }}>
            <rect x="0" y="6" width="220" height="220" fill={liquidColor} />
            <path
              d="M0 10 C 30 7, 60 13, 90 10 S 150 7, 180 10 S 220 13, 250 10 V 16 H 0 Z"
              fill="#ffffff"
              fillOpacity="0.22"
            />
          </g>
        </g>
      )}

      <path d={stationHull} fill="none" stroke="#64748b" strokeWidth="1.8" />

      {[25, 50, 75, 100].map((tick) => {
        const y = 186 - (tick / 100) * 150;
        return (
          <g key={tick}>
            <line x1="166" y1={y} x2="180" y2={y} stroke="#94a3b8" strokeWidth="1.4" />
            <text x="184" y={y + 3} fontSize="8" fill="#94a3b8">{tick}</text>
          </g>
        );
      })}
    </svg>
  );

  const fleetInnerLeft = 8;
  const fleetInnerWidth = 312;
  const fillWidth = (percentage / 100) * fleetInnerWidth;
  const tickLeft = 56;
  const tickWidth = 224;

  const FleetSvg = (
    <svg viewBox="0 0 360 190" className="w-full max-h-44 drop-shadow-md" aria-hidden>
      {defs}
      <clipPath id={`tank-clip-${uid}`}>
        <path d={fleetHull} />
      </clipPath>

      <path d={fleetHull} fill={`url(#shell-${uid})`} stroke="#64748b" strokeWidth="1.8" />
      <path d={fleetHull} fill={`url(#shell-inner-${uid})`} />

      {percentage > 0 && (
        <g clipPath={`url(#tank-clip-${uid})`}>
          <rect x={fleetInnerLeft} y="40" width={Math.max(fillWidth, 48)} height="96" fill={liquidColor} />
          <path
            d={`M ${fleetInnerLeft + fillWidth} 40 C ${fleetInnerLeft + fillWidth + 5} 64, ${fleetInnerLeft + fillWidth - 4} 88, ${fleetInnerLeft + fillWidth + 5} 112 C ${fleetInnerLeft + fillWidth} 124, ${fleetInnerLeft + fillWidth} 136, ${fleetInnerLeft + fillWidth} 136`}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.28"
            strokeWidth="2"
          />
        </g>
      )}

      <path d={fleetHull} fill="none" stroke="#64748b" strokeWidth="1.8" />

      {[25, 50, 75, 100].map((tick) => {
        const x = tickLeft + (tick / 100) * tickWidth;
        return (
          <g key={tick}>
            <line x1={x} y1="140" x2={x} y2="152" stroke="#94a3b8" strokeWidth="1.4" />
            <text
              x={tick === 100 ? x - 2 : x}
              y="164"
              fontSize="8"
              fill="#94a3b8"
              textAnchor={tick === 100 ? "end" : "middle"}
            >
              {tick}
            </text>
          </g>
        );
      })}
    </svg>
  );

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl shadow-xs text-card-foreground w-full",
        !isCompact && "p-6 gap-4",
        className
      )}
    >
      <div className="flex items-center justify-between w-full gap-2">
        <div className="min-w-0">
          {!isCompact && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              {isFleet ? "Truck Storage" : type === "gas" ? "Gas Storage" : "Fuel Storage"}
            </span>
          )}
          <h4 className="font-semibold text-sm leading-tight text-foreground truncate">{label}</h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border", badgeStyle)}>
            {percentage.toFixed(0)}%
          </span>
          {!isCompact && (
            <Badge variant="outline" className={cn("text-[9px] font-bold px-2 py-0 border-none", badgeStyle)}>
              {statusLabel}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex w-full items-center justify-center gap-4">
        <div className={cn("relative", isFleet ? "w-full max-w-[320px]" : rightSide ? "w-[60%] max-w-[150px]" : "w-[72%] max-w-[196px]")}>
          {isFleet ? FleetSvg : StationSvg}
        </div>
        {rightSide && <div className="shrink-0">{rightSide}</div>}
      </div>
      <StatsCard rows={isFleet ? fleetStats : stationStats} />
    </div>
  );
};
