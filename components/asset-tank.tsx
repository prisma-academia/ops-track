import React, { useId } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface AssetTankProps {
  currentLitres: number;
  maxCapacity: number;
  label?: string;
  type?: "fuel" | "gas";
  lossDeduction?: number;
  lossLitres?: number;
  variant?: "default" | "compact";
  className?: string;
}

export const AssetTank: React.FC<AssetTankProps> = ({
  currentLitres,
  maxCapacity,
  label = "Asset Storage Tank",
  type = "fuel",
  lossDeduction,
  lossLitres,
  variant = "default",
  className,
}) => {
  const uid = useId().replace(/:/g, "");
  const percentage = maxCapacity > 0 ? Math.min(Math.max((currentLitres / maxCapacity) * 100, 0), 100) : 0;

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

  const tankBodyTop = type === "gas" ? 55 : 35;
  const tankBodyBottom = type === "gas" ? 175 : 195;
  const tankBodyHeight = tankBodyBottom - tankBodyTop;
  const liquidHeight = (percentage / 100) * tankBodyHeight;
  const liquidY = tankBodyBottom - liquidHeight;
  const isCompact = variant === "compact";

  const TankSvg = (
    <svg
      viewBox="0 0 200 260"
      className={cn(
        "drop-shadow-lg",
        isCompact ? "w-24 h-32" : "w-32 h-44"
      )}
      aria-hidden
    >
      <defs>
        <linearGradient id={`shell-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748b" stopOpacity="0.95" />
          <stop offset="18%" stopColor="#94a3b8" stopOpacity="0.85" />
          <stop offset="45%" stopColor="#cbd5e1" stopOpacity="0.55" />
          <stop offset="72%" stopColor="#94a3b8" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#475569" stopOpacity="0.95" />
        </linearGradient>

        <linearGradient id={`shell-inner-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0f172a" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#0f172a" stopOpacity="0.4" />
        </linearGradient>

        <linearGradient id={`liquid-green-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="35%" stopColor="#10b981" />
          <stop offset="65%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <linearGradient id={`liquid-amber-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="35%" stopColor="#f59e0b" />
          <stop offset="65%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
        <linearGradient id={`liquid-red-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="35%" stopColor="#ef4444" />
          <stop offset="65%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>

        <linearGradient id={`surface-shine-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        <radialGradient id={`ground-shadow-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        <clipPath id={`tank-clip-${uid}`}>
          {type === "gas" ? (
            <path d="M 35 55 A 65 38 0 0 1 165 55 L 165 175 A 65 38 0 0 1 35 175 Z" />
          ) : (
            <path d="M 35 35 A 65 18 0 0 1 165 35 L 165 195 A 65 18 0 0 1 35 195 Z" />
          )}
        </clipPath>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="228" rx="72" ry="10" fill={`url(#ground-shadow-${uid})`} />

      {type === "gas" ? (
        <>
          {/* Gas tank back plate */}
          <path
            d="M 35 55 A 65 38 0 0 1 165 55 L 165 175 A 65 38 0 0 1 35 175 Z"
            fill="currentColor"
            className="text-muted/25"
          />
          {/* Liquid */}
          {percentage > 0 && (
            <g clipPath={`url(#tank-clip-${uid})`}>
              <path
                d={`M 35 ${Math.max(liquidY, 45)} A 65 ${liquidY < 55 ? 38 * ((55 - liquidY) / 10) : 8} 0 0 1 165 ${Math.max(liquidY, 45)} L 165 175 A 65 38 0 0 1 35 175 Z`}
                fill={liquidColor}
                className="transition-all duration-700 ease-out"
              />
              <ellipse
                cx="100"
                cy={Math.max(liquidY, 45)}
                rx="62"
                ry={liquidY < 55 ? 36 * ((55 - liquidY) / 10) : 7}
                fill={`url(#surface-shine-${uid})`}
                className="transition-all duration-700 ease-out"
              />
            </g>
          )}
          {/* Shell overlay */}
          <path
            d="M 35 55 A 65 38 0 0 1 165 55 L 165 175 A 65 38 0 0 1 35 175 Z"
            fill={`url(#shell-inner-${uid})`}
            stroke="currentColor"
            className="text-slate-400/60"
            strokeWidth="2"
          />
          {/* Top dome highlight */}
          <path
            d="M 45 58 A 55 28 0 0 1 155 58"
            fill="none"
            stroke="white"
            strokeOpacity="0.35"
            strokeWidth="2"
          />
        </>
      ) : (
        <>
          {/* Fuel tank empty hull */}
          <path
            d="M 35 35 A 65 18 0 0 1 165 35 L 165 195 A 65 18 0 0 1 35 195 Z"
            fill={`url(#shell-${uid})`}
            stroke="currentColor"
            className="text-slate-500/70"
            strokeWidth="1.5"
          />

          {/* Inner cavity */}
          <path
            d="M 42 42 A 58 14 0 0 1 158 42 L 158 188 A 58 14 0 0 1 42 188 Z"
            fill="currentColor"
            className="text-muted/20"
          />

          {/* Liquid mass */}
          {percentage > 0 && (
            <g clipPath={`url(#tank-clip-${uid})`}>
              <path
                d={`M 42 ${liquidY} A 58 14 0 0 1 158 ${liquidY} L 158 188 A 58 14 0 0 1 42 188 Z`}
                fill={liquidColor}
                className="transition-all duration-700 ease-out"
              />
              {/* Liquid surface meniscus */}
              <ellipse
                cx="100"
                cy={liquidY}
                rx="56"
                ry="13"
                fill={liquidColor}
                filter="brightness(1.2)"
                className="transition-all duration-700 ease-out"
              />
              <ellipse
                cx="100"
                cy={liquidY - 1}
                rx="48"
                ry="9"
                fill={`url(#surface-shine-${uid})`}
                className="transition-all duration-700 ease-out"
              />
            </g>
          )}

          {/* Glass / shell reflection overlay */}
          <path
            d="M 35 35 A 65 18 0 0 1 165 35 L 165 195 A 65 18 0 0 1 35 195 Z"
            fill={`url(#shell-inner-${uid})`}
          />

          {/* Top rim */}
          <ellipse
            cx="100"
            cy="35"
            rx="65"
            ry="18"
            fill="none"
            stroke="currentColor"
            className="text-slate-300/50"
            strokeWidth="2"
          />
          <ellipse
            cx="100"
            cy="35"
            rx="52"
            ry="12"
            fill="none"
            stroke="white"
            strokeOpacity="0.2"
            strokeWidth="1"
          />

          {/* Bottom rim */}
          <path
            d="M 35 195 A 65 18 0 0 0 165 195"
            fill="none"
            stroke="currentColor"
            className="text-slate-600/60"
            strokeWidth="2"
          />

          {/* Vertical highlight stripe */}
          <rect
            x="88"
            y="42"
            width="8"
            height="140"
            rx="4"
            fill="white"
            fillOpacity="0.12"
          />

          {/* Fill level tick marks */}
          {[25, 50, 75].map((tick) => {
            const y = tankBodyBottom - (tick / 100) * tankBodyHeight;
            return (
              <g key={tick}>
                <line x1="168" y1={y} x2="178" y2={y} stroke="currentColor" className="text-muted-foreground/40" strokeWidth="1" />
                <text x="182" y={y + 3} fontSize="7" fill="currentColor" className="text-muted-foreground/50">{tick}</text>
              </g>
            );
          })}
        </>
      )}

      {/* Base platform */}
      <rect x="55" y="200" width="90" height="8" rx="2" fill="currentColor" className="text-slate-600/80" />
      <rect x="60" y="208" width="80" height="4" rx="1" fill="currentColor" className="text-slate-700/60" />
    </svg>
  );

  if (isCompact) {
    return (
      <div className={cn("flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl shadow-xs text-card-foreground", className)}>
        <div className="relative">
          {TankSvg}
          <div className={cn("absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-xs border whitespace-nowrap", badgeStyle)}>
            {percentage.toFixed(0)}%
          </div>
        </div>
        <div className="text-center space-y-1 w-full">
          <h4 className="font-semibold text-sm leading-tight text-foreground truncate">{label}</h4>
          <div className={cn("text-lg font-bold font-mono tracking-tight", textThemeColor)}>
            {currentLitres.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">{type === "gas" ? "KG" : "L"}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">
            / {maxCapacity.toLocaleString()} {type === "gas" ? "KG" : "L"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-6 p-6 bg-card border border-border rounded-xl w-full text-card-foreground shadow-xs", className)}>
      <div className="relative shrink-0 flex items-center justify-center">
        {TankSvg}
        <div className={cn("absolute bottom-2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold shadow-xs border", badgeStyle)}>
          {percentage.toFixed(0)}%
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-between w-full h-full space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between sm:justify-start lg:justify-between xl:justify-start gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              {type === "gas" ? "Gas Storage" : "Fuel Storage"}
            </span>
            <Badge variant="outline" className={cn("text-[9px] font-bold px-2 py-0 border-none shrink-0", badgeStyle)}>
              {statusLabel}
            </Badge>
          </div>
          <h4 className="font-semibold text-sm leading-tight text-foreground">{label}</h4>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Current Volume</span>
          <div className={cn("text-2xl font-bold font-mono tracking-tight", textThemeColor)}>
            {currentLitres.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{type === "gas" ? "KG" : "L"}</span>
          </div>

          <div className="flex justify-between items-center text-xs text-muted-foreground/80 pt-2 mt-2 border-t border-border/50">
            <span>Capacity</span>
            <span className="font-mono font-semibold text-foreground">
              {maxCapacity.toLocaleString()} {type === "gas" ? "KG" : "L"}
            </span>
          </div>

          {lossLitres !== undefined && lossLitres > 0 ? (
            <div className="flex justify-between items-center text-xs text-rose-600 dark:text-rose-400 font-semibold pt-2 mt-2 border-t border-rose-500/20 bg-rose-500/5 px-2 py-1 rounded">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-rose-500 animate-pulse" />
                Loss Volume
              </span>
              <span className="font-mono">
                {lossLitres.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {type === "gas" ? "KG" : "L"}
              </span>
            </div>
          ) : lossDeduction !== undefined && lossDeduction > 0 ? (
            <div className="flex justify-between items-center text-xs text-rose-600 dark:text-rose-400 font-semibold pt-2 mt-2 border-t border-rose-500/20 bg-rose-500/5 px-2 py-1 rounded">
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-1.5 rounded-full bg-rose-500 animate-pulse" />
                Loss Deduction
              </span>
              <span className="font-mono">
                ₦{lossDeduction.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
