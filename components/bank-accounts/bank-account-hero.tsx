"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { format } from "date-fns";
import { Eye, EyeOff, TrendingUp, Wifi, Copy, Check } from "lucide-react";
import { animate, useInView, useMotionValue, useMotionValueEvent } from "motion/react";
import { toast } from "sonner";
import { BankLogo } from "@/components/bank-accounts/bank-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type HeroAccount = {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankSlug?: string | null;
  bankCode?: string | null;
  scope: "STATION" | "FLEET";
  createdAt: string;
};

type HeroSummary = {
  totalCredited: number;
  totalDebited: number;
  netBalance: number;
  transactionCount: number;
};

const formatMoney = (value: number) =>
  `₦${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function formatAccountNumber(value: string, revealed: boolean) {
  const digits = value.replace(/\s+/g, "");
  if (!digits) return "—";
  if (!revealed) {
    if (digits.length <= 8) {
      return `${digits.slice(0, 2)}  ${"•".repeat(Math.max(digits.length - 4, 2))}  ${digits.slice(-2)}`;
    }
    const hidden = "•".repeat(digits.length - 8).replace(/(.{4})/g, "$1 ").trim();
    return `${digits.slice(0, 4)}  ${hidden}  ${digits.slice(-4)}`;
  }
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function AnimatedCounter({
  value,
  prefix = "",
  isInView = true,
}: {
  value: number;
  prefix?: string;
  isInView?: boolean;
}) {
  const count = useMotionValue(0);
  const [text, setText] = useState("0.00");

  useMotionValueEvent(count, "change", (latest) => {
    setText(
      Math.max(0, latest).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  });

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(count, value, { duration: 1.5 });
    return () => controls.stop();
  }, [count, isInView, value]);

  return (
    <span>
      {prefix}
      {text}
    </span>
  );
}

function ChipSVG() {
  return (
    <svg width="44" height="34" viewBox="0 0 44 34" fill="none" aria-hidden="true">
      <rect width="44" height="34" rx="5" fill="#C9963A" />
      <rect x="14" width="16" height="34" fill="#B8852A" />
      <rect y="11" width="44" height="12" fill="#B8852A" />
      <rect x="14" y="11" width="16" height="12" fill="#E0B060" />
      <line x1="14" y1="0" x2="14" y2="11" stroke="#9A6E1A" strokeWidth="0.6" />
      <line x1="30" y1="0" x2="30" y2="11" stroke="#9A6E1A" strokeWidth="0.6" />
      <line x1="14" y1="23" x2="14" y2="34" stroke="#9A6E1A" strokeWidth="0.6" />
      <line x1="30" y1="23" x2="30" y2="34" stroke="#9A6E1A" strokeWidth="0.6" />
      <line x1="0" y1="11" x2="14" y2="11" stroke="#9A6E1A" strokeWidth="0.6" />
      <line x1="0" y1="23" x2="14" y2="23" stroke="#9A6E1A" strokeWidth="0.6" />
      <line x1="30" y1="11" x2="44" y2="11" stroke="#9A6E1A" strokeWidth="0.6" />
      <line x1="30" y1="23" x2="44" y2="23" stroke="#9A6E1A" strokeWidth="0.6" />
    </svg>
  );
}

function ReceiveDepositCard({
  account,
  summary,
}: {
  account: HeroAccount;
  summary: HeroSummary;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <div ref={ref} className="h-full">
      <Card className="relative h-full gap-0 overflow-hidden border-0 bg-blue-500 px-7 py-7 text-white shadow-xl ring-0 dark:bg-blue-500">
        <div className="grid h-full grid-cols-12 items-center gap-4">
          <div className="col-span-12 md:col-span-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
                <TrendingUp size={24} className="text-neutral-600" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-medium text-white">{account.accountName}</h2>
                <p className="truncate text-sm text-white/75">
                  {account.bankName} · {summary.transactionCount.toLocaleString()} transactions
                </p>
              </div>
            </div>

            <div className="mt-8 flex w-full flex-wrap">
              <div className="border-e border-white/20 pe-4">
                <p className="mb-1 text-sm text-white/75">Receive</p>
                <p className="text-2xl font-semibold tracking-tight text-white">
                  <AnimatedCounter
                    value={summary.totalCredited}
                    isInView={isInView}
                    prefix="₦"
                  />
                </p>
              </div>
              <div className="ps-4">
                <p className="mb-1 text-sm text-white/75">Deposit</p>
                <p className="text-2xl font-semibold tracking-tight text-white">
                  <AnimatedCounter
                    value={summary.totalDebited}
                    isInView={isInView}
                    prefix="₦"
                  />
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-12 flex justify-center md:col-span-4 md:justify-end">
            <div className="flex size-28 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
              <BankLogo
                slug={account.bankSlug}
                bankName={account.bankName}
                size={72}
                className="bg-transparent"
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function FlipBankCard({
  account,
  balance,
}: {
  account: HeroAccount;
  balance: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const opened = format(new Date(account.createdAt), "MM / yy");
  const bankCode = account.bankCode?.trim() || "—";

  const copyAccountNumber = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!account.accountNumber) return;
    navigator.clipboard.writeText(account.accountNumber.replace(/\s+/g, ""));
    setCopied(true);
    toast.success("Account number copied");
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
      <div
        className="relative h-56 w-full cursor-pointer"
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped((current) => !current)}
      >
        <div
          className="relative h-full w-full transition-transform duration-700 ease-in-out"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <Card
            className="absolute inset-0 gap-0 overflow-hidden rounded-2xl border-0 bg-transparent p-0 py-0 shadow-2xl ring-0"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-500 via-sky-400 to-teal-400" />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute -top-16 -right-16 size-52 rounded-full bg-white/10 blur-md" />
            <div className="absolute -bottom-20 -left-14 size-64 rounded-full bg-white/5 blur-md" />

            <CardContent className="relative z-10 flex h-full flex-col justify-between p-6">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-lg font-bold tracking-wider text-white uppercase">
                  {account.bankName}
                </span>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <p className="text-xs tracking-wider text-white/70 uppercase">Balance</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold tracking-wide text-white select-none">
                      {showDetails ? formatMoney(balance) : "••••••••"}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        setShowDetails((current) => !current);
                      }}
                      className="rounded-full text-white/80 hover:bg-black/30! hover:text-white"
                      aria-label={showDetails ? "Hide balance" : "Show balance"}
                    >
                      {showDetails ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <ChipSVG />
                <Wifi className="size-5 rotate-90 text-white/80" />
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-base tracking-widest text-white select-none">
                  {formatAccountNumber(account.accountNumber, showDetails)}
                </p>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={copyAccountNumber}
                  className="rounded-full text-white/80 hover:bg-black/30! hover:text-white"
                  aria-label="Copy account number"
                >
                  {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
                </Button>
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs tracking-wider text-white/70 uppercase">Account holder</p>
                  <p className="mt-0.5 truncate text-sm font-semibold tracking-widest text-white uppercase">
                    {account.accountName}
                  </p>
                </div>
                <div className="shrink-0">
                  <p className="text-xs tracking-wider text-white/70 uppercase">Opened</p>
                  <p className="mt-0.5 text-sm font-semibold tracking-widest text-white">{opened}</p>
                </div>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1">
                  <BankLogo
                    slug={account.bankSlug}
                    bankName={account.bankName}
                    size={36}
                    className="rounded-md bg-transparent"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="absolute inset-0 gap-0 overflow-hidden rounded-2xl border-0 bg-transparent p-0 py-4 shadow-2xl ring-0"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="absolute inset-0 bg-linear-to-br from-blue-500 via-sky-400 to-teal-400" />
            <div className="absolute inset-0 bg-black/30" />

            <div className="relative z-10 flex h-full flex-col gap-4">
              <div className="h-11 w-full bg-black/80" />

              <CardContent className="flex flex-col gap-3 px-6">
                <div className="flex items-end gap-3">
                  <div className="flex h-8 flex-1 items-center overflow-hidden rounded-sm bg-white/90">
                    {Array.from({ length: 24 }).map((_, index) => (
                      <div
                        key={index}
                        className={cn(
                          "h-full flex-1",
                          index % 2 === 0 ? "bg-slate-300/70" : "bg-white/80",
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <span className="text-xs tracking-widest text-white/70 uppercase">Code</span>
                    <div className="min-w-12 rounded-sm bg-white px-2 py-1.5 text-center font-mono text-sm font-bold text-slate-900 select-none">
                      {showDetails ? bankCode : "•••"}
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-white/60">
                  This account is held at {account.bankName}. Use the account number only for
                  authorized {account.scope === "FLEET" ? "fleet" : "station"} payments.
                </p>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Click card to flip</p>
    </div>
  );
}

export function BankAccountHero({
  account,
  summary,
}: {
  account: HeroAccount;
  summary: HeroSummary;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <ReceiveDepositCard account={account} summary={summary} />
      </div>
      <div className="flex justify-center lg:col-span-5 lg:justify-end">
        <FlipBankCard account={account} balance={summary.netBalance} />
      </div>
    </div>
  );
}
