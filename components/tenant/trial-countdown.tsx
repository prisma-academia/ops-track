"use client";

import { useEffect, useState } from "react";

function remaining(endsAt: string, now: number) {
  const totalSeconds = Math.max(0, Math.floor((new Date(endsAt).getTime() - now) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hrs" },
  { key: "minutes", label: "Min" },
  { key: "seconds", label: "Sec" },
] as const;

export function TrialCountdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const left = remaining(endsAt, now);

  return (
    <div className="ml-auto flex shrink-0 items-center gap-1" aria-label="Trial time remaining">
      {UNITS.map((unit) => {
        const value = String(left[unit.key]).padStart(2, "0");
        return (
          <span
            key={unit.key}
            className="flex min-w-11 flex-col items-center rounded-lg bg-background/80 px-1.5 py-1 ring-1 ring-current/10"
          >
            <span
              key={value}
              className="text-sm font-bold tabular-nums leading-none animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              {value}
            </span>
            <span className="mt-1 text-[10px] font-normal uppercase tracking-wide opacity-70">
              {unit.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
