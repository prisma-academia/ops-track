"use client";

import { useState, useMemo } from "react";
import { apiPost, apiDelete } from "@/lib/client/api";
import { Card } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField, TextInput } from "@/components/form-field";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  Wallet01Icon,
  CreditCardIcon,
  ReceiptDollarIcon,
  FuelStationIcon,
  Fuel01Icon,
  Car01Icon,
  TruckIcon,
  UserGroupIcon,
  User02Icon,
  UserIcon,
  Location01Icon,
  Building01Icon,
  Add01Icon,
  Delete02Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle01Icon,
  AlertCircleIcon,
  Clock01Icon,
  Analytics01Icon,
  Invoice01Icon,
  Shield01Icon,
  Home01Icon,
} from "@hugeicons/core-free-icons";

interface ClientPortalDashboardProps {
  client: any;
  tenantName: string;
}

export function ClientPortalDashboard({ client, tenantName }: ClientPortalDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "stations" | "vehicles" | "drivers" | "orders" | "ledger">("overview");

  // Local state for vehicles and drivers so additions/deletions update immediately
  const [vehicles, setVehicles] = useState<any[]>(client.vehicles || []);
  const [drivers, setDrivers] = useState<any[]>(client.drivers || []);

  // Top-Up Modal State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("50000");
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  // Vehicle Modal State
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({
    plateNumber: "",
    makeModel: "",
    fuelType: "AGO" as "PMS" | "AGO" | "DPK" | "LPG",
    tankCapacity: 70,
    dailyLimitLiters: "",
  });
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);

  // Driver Modal State
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({
    fullName: "",
    phone: "",
    licenseNumber: "",
  });
  const [driverSubmitting, setDriverSubmitting] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);

  // ── Computed Aggregates ──────────────────────────────────────────────────

  const totalVolume = useMemo(() => {
    return (client.fuelOrders || []).reduce((acc: number, o: any) => acc + (Number(o.liters) || 0), 0);
  }, [client.fuelOrders]);

  const totalSpend = useMemo(() => {
    return (client.fuelOrders || []).reduce((acc: number, o: any) => acc + (Number(o.totalAmount) || 0), 0);
  }, [client.fuelOrders]);

  const pmsVolume = useMemo(() => {
    return (client.fuelOrders || [])
      .filter((o: any) => o.productType === "PMS")
      .reduce((acc: number, o: any) => acc + (Number(o.liters) || 0), 0);
  }, [client.fuelOrders]);

  const agoVolume = useMemo(() => {
    return (client.fuelOrders || [])
      .filter((o: any) => o.productType === "AGO")
      .reduce((acc: number, o: any) => acc + (Number(o.liters) || 0), 0);
  }, [client.fuelOrders]);

  // Weekly breakdown calculation (last 7 days)
  const weeklyData = useMemo(() => {
    const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();

    (client.fuelOrders || []).forEach((o: any) => {
      const orderDate = new Date(o.createdAt);
      const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const dayIdx = (orderDate.getDay() + 6) % 7; // Mon = 0
        dayTotals[dayIdx] += Number(o.liters) || 0;
      }
    });

    const maxVal = Math.max(...dayTotals, 100);
    let peakIdx = 3; // Default Thursday if zero records
    let maxFound = -1;
    dayTotals.forEach((val, i) => {
      if (val > maxFound) {
        maxFound = val;
        peakIdx = i;
      }
    });

    return days.map((day, idx) => {
      const val = dayTotals[idx];
      const hasRealData = val > 0;
      // If no actual orders yet, provide realistic mock baseline heights for the visual chart
      const heightPercent = hasRealData
        ? Math.max(16, Math.round((val / maxVal) * 100))
        : [25, 45, 38, 92, 48, 55, 62][idx];
      const isPeak = hasRealData ? idx === peakIdx : idx === 3;
      return {
        day,
        liters: val,
        heightPercent,
        isPeak,
      };
    });
  }, [client.fuelOrders]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePaystackTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setFunding(true);
    setFundError(null);

    const amount = Number(depositAmount);
    if (!amount || amount < 100) {
      setFundError("Minimum deposit amount is ₦100.");
      setFunding(false);
      return;
    }

    const res = await apiPost<{ authorization_url: string }>("/api/client/wallet/fund", {
      amount,
    });
    setFunding(false);

    if (res.error) {
      setFundError(res.error.message);
      return;
    }

    if (res.data?.authorization_url) {
      window.location.href = res.data.authorization_url;
    }
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleSubmitting(true);
    setVehicleError(null);

    const payload = {
      plateNumber: vehicleForm.plateNumber.trim().toUpperCase(),
      makeModel: vehicleForm.makeModel.trim() || undefined,
      fuelType: vehicleForm.fuelType,
      tankCapacity: Number(vehicleForm.tankCapacity),
      dailyLimitLiters: vehicleForm.dailyLimitLiters ? Number(vehicleForm.dailyLimitLiters) : undefined,
    };

    const res = await apiPost<{ vehicle: any }>("/api/client/vehicles", payload);
    setVehicleSubmitting(false);

    if (res.error) {
      setVehicleError(res.error.message);
      return;
    }

    const newVehicle = res.data?.vehicle;
    if (newVehicle) {
      setVehicles([newVehicle, ...vehicles.filter((v) => v.id !== newVehicle.id)]);
      setShowVehicleModal(false);
      setVehicleForm({
        plateNumber: "",
        makeModel: "",
        fuelType: "AGO",
        tankCapacity: 70,
        dailyLimitLiters: "",
      });
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to remove this vehicle from your active fleet?")) return;
    const res = await apiDelete(`/api/client/vehicles/${vehicleId}`);
    if (!res.error) {
      setVehicles(vehicles.filter((v) => v.id !== vehicleId));
    } else {
      alert(res.error.message);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverSubmitting(true);
    setDriverError(null);

    const res = await apiPost<{ driver: any }>("/api/client/drivers", {
      fullName: driverForm.fullName.trim(),
      phone: driverForm.phone.trim(),
      licenseNumber: driverForm.licenseNumber.trim() || undefined,
    });
    setDriverSubmitting(false);

    if (res.error) {
      setDriverError(res.error.message);
      return;
    }

    const newDriver = res.data?.driver;
    if (newDriver) {
      setDrivers([newDriver, ...drivers.filter((d) => d.id !== newDriver.id)]);
      setShowDriverModal(false);
      setDriverForm({
        fullName: "",
        phone: "",
        licenseNumber: "",
      });
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm("Are you sure you want to remove this driver from your account?")) return;
    const res = await apiDelete(`/api/client/drivers/${driverId}`);
    if (!res.error) {
      setDrivers(drivers.filter((d) => d.id !== driverId));
    } else {
      alert(res.error.message);
    }
  };

  const balanceAmount =
    client.billingModel === "PREPAID" ? Number(client.depositBalance) : Number(client.outstandingDebt);

  return (
    <div className="space-y-6">
      {/* ── Breadcrumb & Dashboard Banner Header ───────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <HugeiconsIcon icon={Home01Icon} size={14} strokeWidth={2} className="size-3.5" />
          <span>/</span>
          <span>Client Portal</span>
          <span>/</span>
          <span className="text-foreground">Fleet Operations</span>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-2xs">
              <HugeiconsIcon icon={FuelStationIcon} size={24} strokeWidth={2} className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {client.companyName || client.email}
                </h1>
                <Badge
                  variant={client.billingModel === "PREPAID" ? "default" : "secondary"}
                  className={
                    client.billingModel === "PREPAID"
                      ? "bg-primary/15 text-primary border-primary/30 text-[11px] font-mono font-semibold"
                      : "bg-muted text-foreground border-border text-[11px] font-mono font-semibold"
                  }
                >
                  {client.billingModel} ACCOUNT
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Corporate Fleet Fueling, Real-time Consumption & Wallet Management — Network:{" "}
                <span className="font-semibold text-foreground">{tenantName}</span>
              </p>
            </div>
          </div>

          {/* Quick Header Summary Stats (Concept Image Header Right Stats) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60">
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                {client.billingModel === "PREPAID" ? "Deposit" : "Debt"}
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-foreground">
                ₦{balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Fleet
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-foreground">
                {vehicles.length} Vehicles
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Drivers
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-foreground">
                {drivers.length} Active
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                Volume
              </span>
              <span className="font-mono text-sm sm:text-base font-bold text-foreground">
                {totalVolume.toLocaleString()} L
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Hero: 2x2 Metric Cards (Left) + Fuel & Spend Insights (Right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Side: 4 Metric Cards in 2x2 Grid */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Metric 1: Wallet / Credit */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-accent/80 text-primary border border-border/70">
                <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {client.billingModel}
              </span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                ₦{balanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">
                {client.billingModel === "PREPAID" ? "Available Deposit Balance" : "Outstanding Fuel Debt"}
              </div>
            </div>
            <div className="pt-2 border-t border-border/40">
              <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                {client.billingModel === "PREPAID"
                  ? "Instant Paystack Settlement"
                  : `Credit Limit: ₦${Number(client.creditLimit).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Metric 2: Total Orders / Dispenses */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-accent/80 text-foreground border border-border/70">
                <HugeiconsIcon icon={Invoice01Icon} size={18} strokeWidth={2} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <span>+18%</span>
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={11} strokeWidth={2} />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {client.fuelOrders?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">
                Total Fuel Collections
              </div>
            </div>
            <div className="pt-2 border-t border-border/40">
              <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                {totalVolume.toLocaleString()} Liters Dispensed
              </span>
            </div>
          </div>

          {/* Metric 3: Fleet Vehicles */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-accent/80 text-foreground border border-border/70">
                <HugeiconsIcon icon={Car01Icon} size={18} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                All Active
              </span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {vehicles.length}
              </div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">
                Registered Fleet Vehicles
              </div>
            </div>
            <div className="pt-2 border-t border-border/40">
              <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                Assigned Branch Access
              </span>
            </div>
          </div>

          {/* Metric 4: Authorized Drivers */}
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-accent/80 text-foreground border border-border/70">
                <HugeiconsIcon icon={UserGroupIcon} size={18} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Verified
              </span>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-foreground">
                {drivers.length}
              </div>
              <div className="text-xs text-muted-foreground font-medium mt-0.5">
                Authorized Fleet Drivers
              </div>
            </div>
            <div className="pt-2 border-t border-border/40">
              <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                SMS Token Ready
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Fuel & Spend Insights Card (Direct Concept Image Recreation) */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Fuel Consumption Insights</h2>
              <p className="text-xs text-muted-foreground">Weekly volume & fleet dispense trends</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md border border-border/40">
                {client.allowedStations?.length || 0} Permitted Stations
              </span>
            </div>
          </div>

          {/* Big Stat + Trend */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-foreground tracking-tight">
                ₦{totalSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <span className="flex items-center gap-0.5 text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                <span>+10%</span>
                <HugeiconsIcon icon={ArrowUpRight01Icon} size={12} strokeWidth={2} />
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-lg">
              Total volume consumed across your registered fleet vehicles. Active real-time telemetry from assigned station dispensers.
            </p>
          </div>

          {/* Bar Chart Representation (Mon - Sun) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-end justify-between gap-2 sm:gap-4 h-28 sm:h-32 px-2 pb-1">
              {weeklyData.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div
                    style={{ height: `${item.heightPercent}%` }}
                    className={`w-full max-w-[42px] rounded-lg transition-all duration-300 relative ${
                      item.isPeak
                        ? "bg-primary shadow-xs ring-2 ring-primary/30"
                        : "bg-muted/70 group-hover:bg-muted"
                    }`}
                  >
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-[10px] font-mono px-1.5 py-0.5 rounded shadow-sm pointer-events-none whitespace-nowrap z-10 border border-border">
                      {item.liters > 0 ? `${item.liters} L` : `${item.day}`}
                    </div>
                  </div>
                  <span className={`text-[11px] font-mono ${item.isPeak ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {item.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Breakdown Row (Concept image Earning, Profit, Expense row) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HugeiconsIcon icon={Fuel01Icon} size={16} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">PMS Petrol</span>
                <span className="font-mono text-xs font-bold text-foreground">{pmsVolume.toLocaleString()} Liters</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HugeiconsIcon icon={TruckIcon} size={16} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AGO Diesel</span>
                <span className="font-mono text-xs font-bold text-foreground">{agoVolume.toLocaleString()} Liters</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <HugeiconsIcon icon={ReceiptDollarIcon} size={16} strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Network Limit</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {client.dailyMaxLiters ? `${client.dailyMaxLiters} L / Day` : "Unlimited"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation Tabs & Quick Action Bar ──────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-2 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto text-sm no-scrollbar">
          {[
            { key: "overview", label: "Fleet Summary", icon: DashboardSquare01Icon },
            { key: "stations", label: `Permitted Branches (${client.allowedStations?.length || 0})`, icon: Location01Icon },
            { key: "vehicles", label: `Fleet Vehicles (${vehicles.length})`, icon: Car01Icon },
            { key: "drivers", label: `Authorized Drivers (${drivers.length})`, icon: UserGroupIcon },
            { key: "orders", label: `Fuel Dispenses (${client.fuelOrders?.length || 0})`, icon: FuelStationIcon },
            { key: "ledger", label: "Wallet Ledger", icon: ReceiptDollarIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                }`}
              >
                <HugeiconsIcon icon={Icon} size={16} strokeWidth={2} className="size-4 shrink-0 text-current" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {client.billingModel === "PREPAID" ? (
            <Button
              onClick={() => setShowTopUpModal(true)}
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} />
              Fund Wallet
            </Button>
          ) : (
            <Button
              onClick={() => setShowTopUpModal(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs font-semibold shadow-xs border-border"
            >
              <HugeiconsIcon icon={CreditCardIcon} size={15} strokeWidth={2} />
              Settle Debt
            </Button>
          )}

          <Button
            onClick={() => setShowVehicleModal(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-medium border-border"
          >
            <HugeiconsIcon icon={Car01Icon} size={15} strokeWidth={2} />
            Add Vehicle
          </Button>

          <Button
            onClick={() => setShowDriverModal(true)}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-medium border-border"
          >
            <HugeiconsIcon icon={UserIcon} size={15} strokeWidth={2} />
            Add Driver
          </Button>
        </div>
      </div>

      {/* ── 1. FLEET SUMMARY TAB ───────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={Building01Icon} size={16} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold text-foreground">Corporate Account Details</h3>
            </div>
            <div className="space-y-2.5 text-xs divide-y divide-border/30">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Registered Company</span>
                <span className="font-semibold text-foreground">{client.companyName || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Corporate Email</span>
                <span className="font-mono font-medium text-foreground">{client.email}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Fleet Operations Officer</span>
                <span className="font-medium text-foreground">{client.contactPerson || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Contact Phone</span>
                <span className="font-mono text-foreground">{client.phone || "—"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Authorization Mode</span>
                <span className="font-medium text-foreground">
                  {client.approvalRequirement === "MANAGER_ONLY"
                    ? "Station Manager Verification"
                    : "Client Admin Real-Time Approval"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <HugeiconsIcon icon={Shield01Icon} size={16} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-bold text-foreground">Fleet Fueling Policy</h3>
            </div>
            <div className="space-y-2.5 text-xs divide-y divide-border/30">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Payment Processor</span>
                <span className="font-medium text-foreground">Paystack (Direct Settlement)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Billing Cycle</span>
                <span className="font-mono text-foreground">Every {client.billingCycleDays || 30} Days</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Interest / Penalty Fee</span>
                <span className="font-medium text-primary font-mono">0% (None)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Daily Max Volume Limit</span>
                <span className="font-mono font-bold text-foreground">
                  {client.dailyMaxLiters ? `${client.dailyMaxLiters} Liters / Day` : "Unlimited"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Network Provider</span>
                <span className="font-semibold text-foreground">{tenantName} Operations</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── 2. PERMITTED BRANCHES TAB ──────────────────────────────────── */}
      {activeTab === "stations" && (
        <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Authorized Station Branches</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your drivers can only collect fuel at these approved branches within the {tenantName} network.
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/40">
              {client.allowedStations?.length || 0} Branches Enabled
            </span>
          </div>

          {client.allowedStations?.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
              <HugeiconsIcon icon={Location01Icon} size={28} strokeWidth={2} className="mx-auto text-muted-foreground/40" />
              <p>No specific station branches configured. Contact station operations to assign branch access.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {client.allowedStations.map((acc: any) => {
                const st = acc.station;
                return (
                  <div
                    key={st.id}
                    className="p-4 rounded-xl border border-border bg-card shadow-2xs hover:border-border/80 transition-colors flex justify-between items-start"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-foreground">{st.name}</div>
                      <div className="text-xs text-muted-foreground font-mono bg-muted/60 inline-block px-1.5 py-0.5 rounded">
                        {st.code}
                      </div>
                      {st.location && (
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground pt-1">
                          <HugeiconsIcon icon={Location01Icon} size={13} strokeWidth={2} className="shrink-0" />
                          <span className="truncate">{st.location}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/10">
                      Approved
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── 3. FLEET VEHICLES TAB ───────────────────────────────────────── */}
      {activeTab === "vehicles" && (
        <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Registered Fleet Vehicles</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicles authorized to dispense fuel at assigned station branches.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowVehicleModal(true)}
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} />
              Add Vehicle
            </Button>
          </div>

          {vehicles.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <HugeiconsIcon icon={Car01Icon} size={32} strokeWidth={2} className="mx-auto text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No vehicles registered in your fleet yet.</p>
              <Button size="sm" variant="outline" onClick={() => setShowVehicleModal(true)} className="text-xs gap-1.5">
                <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} /> Add First Vehicle
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2.5 px-3">Plate Number</th>
                    <th className="py-2.5 px-3">Make / Model</th>
                    <th className="py-2.5 px-3">Fuel Type</th>
                    <th className="py-2.5 px-3">Tank Capacity</th>
                    <th className="py-2.5 px-3">Daily Limit</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {vehicles.map((v: any) => (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-foreground">{v.plateNumber}</td>
                      <td className="py-3 px-3 text-foreground">{v.makeModel || "—"}</td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-[10px] font-mono border-border bg-muted/50">
                          {v.fuelType}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono">{v.tankCapacity} Liters</td>
                      <td className="py-3 px-3 font-mono">
                        {v.dailyLimitLiters ? `${v.dailyLimitLiters} L` : "None"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => handleDeleteVehicle(v.id)}
                          title="Remove vehicle"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── 4. AUTHORIZED DRIVERS TAB ───────────────────────────────────── */}
      {activeTab === "drivers" && (
        <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border-border bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Authorized Fleet Drivers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personnel permitted to collect fuel on behalf of your company.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowDriverModal(true)}
              className="gap-1.5 text-xs font-semibold shadow-xs"
            >
              <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} />
              Add Driver
            </Button>
          </div>

          {drivers.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <HugeiconsIcon icon={UserGroupIcon} size={32} strokeWidth={2} className="mx-auto text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No drivers registered yet.</p>
              <Button size="sm" variant="outline" onClick={() => setShowDriverModal(true)} className="text-xs gap-1.5">
                <HugeiconsIcon icon={Add01Icon} size={15} strokeWidth={2} /> Add First Driver
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2.5 px-3">Driver Name</th>
                    <th className="py-2.5 px-3">Phone Number</th>
                    <th className="py-2.5 px-3">License / Staff ID</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {drivers.map((d: any) => (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground">{d.fullName}</td>
                      <td className="py-3 px-3 font-mono">{d.phone}</td>
                      <td className="py-3 px-3 font-mono">{d.licenseNumber || "—"}</td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={() => handleDeleteDriver(d.id)}
                          title="Remove driver"
                        >
                          <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── 5. FUEL DISPENSES TAB ───────────────────────────────────────── */}
      {activeTab === "orders" && (
        <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border-border bg-card">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground">Fuel Dispense History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verified fuel collections made by authorized drivers at station network branches.
            </p>
          </div>

          {client.fuelOrders?.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
              <HugeiconsIcon icon={FuelStationIcon} size={28} strokeWidth={2} className="mx-auto text-muted-foreground/40" />
              <p>No fuel dispenses recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Station Branch</th>
                    <th className="py-2.5 px-3">Vehicle</th>
                    <th className="py-2.5 px-3">Driver</th>
                    <th className="py-2.5 px-3">Volume</th>
                    <th className="py-2.5 px-3">Price / L</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {client.fuelOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 text-muted-foreground font-mono">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-semibold text-foreground">{o.station?.name}</td>
                      <td className="py-3 px-3 font-mono font-medium">{o.vehicle?.plateNumber}</td>
                      <td className="py-3 px-3">{o.driver?.fullName}</td>
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold">{o.liters} L</span>{" "}
                        <span className="text-[10px] text-muted-foreground">({o.productType})</span>
                      </td>
                      <td className="py-3 px-3 font-mono">₦{o.pricePerLiter}</td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        ₦{Number(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3">
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/10">
                          {o.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── 6. WALLET LEDGER TAB ────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <Card className="p-5 sm:p-6 space-y-4 rounded-2xl border-border bg-card">
          <div className="border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground">Financial Transactions & Top-Ups</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Complete audit ledger of prepaid wallet fundings, postpaid debt settlements, and fuel debits.
            </p>
          </div>

          {client.walletLedgers?.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
              <HugeiconsIcon icon={ReceiptDollarIcon} size={28} strokeWidth={2} className="mx-auto text-muted-foreground/40" />
              <p>No ledger transactions recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-left">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Description / Reference</th>
                    <th className="py-2.5 px-3">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {client.walletLedgers.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 text-muted-foreground font-mono">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className={
                            l.type === "CREDIT"
                              ? "text-[10px] font-mono text-primary border-primary/30 bg-primary/10"
                              : "text-[10px] font-mono border-border bg-muted/50"
                          }
                        >
                          {l.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        ₦{Number(l.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground font-mono">
                        {l.description || l.reference || "—"}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium">
                        ₦{Number(l.balanceAfter).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── MODAL: TOP-UP VIA PAYSTACK ─────────────────────────────────── */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Wallet01Icon} size={16} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-foreground">
                  {client.billingModel === "PREPAID" ? "Fund Prepaid Deposit" : "Settle Outstanding Debt"}
                </h3>
              </div>
              <button
                onClick={() => setShowTopUpModal(false)}
                className="text-muted-foreground hover:text-foreground size-7 flex items-center justify-center rounded-lg hover:bg-muted text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePaystackTopUp} className="space-y-4 text-xs">
              <FormField
                label="Amount (₦)"
                htmlFor="depositAmount"
                description="Processed securely via Paystack"
                required
              >
                <TextInput
                  id="depositAmount"
                  type="number"
                  min="100"
                  step="500"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="text-base font-mono font-bold"
                  required
                />
              </FormField>

              {/* Quick Select Amount Pills */}
              <div className="flex flex-wrap gap-2">
                {["20000", "50000", "100000", "250000"].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setDepositAmount(amt)}
                    className={`px-2.5 py-1 text-[11px] font-mono rounded-lg border transition-colors cursor-pointer ${
                      depositAmount === amt
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ₦{Number(amt).toLocaleString()}
                  </button>
                ))}
              </div>

              {fundError && <p className="text-destructive text-xs font-medium">{fundError}</p>}

              <div className="p-3 rounded-xl bg-muted/40 border border-border text-[11px] text-muted-foreground leading-relaxed">
                You will be redirected to the secure Paystack checkout to complete payment via Card, Bank Transfer, or USSD.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTopUpModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={funding} className="font-semibold shadow-xs">
                  {funding ? "Connecting to Paystack…" : "Proceed to Paystack"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD VEHICLE ─────────────────────────────────────────── */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HugeiconsIcon icon={Car01Icon} size={16} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-foreground">Register Fleet Vehicle</h3>
              </div>
              <button
                onClick={() => setShowVehicleModal(false)}
                className="text-muted-foreground hover:text-foreground size-7 flex items-center justify-center rounded-lg hover:bg-muted text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="space-y-3.5 text-xs">
              <FormField label="Plate Number" htmlFor="plateNumber" description="e.g. ABC-123XY" required>
                <TextInput
                  id="plateNumber"
                  value={vehicleForm.plateNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                  placeholder="ABC-123XY"
                  className="font-mono uppercase font-bold"
                  required
                />
              </FormField>

              <FormField label="Vehicle Make / Model" htmlFor="makeModel" description="e.g. Toyota Hilux 2022">
                <TextInput
                  id="makeModel"
                  value={vehicleForm.makeModel}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, makeModel: e.target.value })}
                  placeholder="e.g. Toyota Hilux 2.8 GD-6"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Fuel Product" htmlFor="fuelType" required>
                  <select
                    id="fuelType"
                    value={vehicleForm.fuelType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value as any })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs"
                  >
                    <option value="PMS">PMS (Petrol)</option>
                    <option value="AGO">AGO (Diesel)</option>
                    <option value="DPK">DPK (Kerosene)</option>
                    <option value="LPG">LPG (Gas)</option>
                  </select>
                </FormField>

                <FormField label="Tank Capacity (Liters)" htmlFor="tankCapacity" required>
                  <TextInput
                    id="tankCapacity"
                    type="number"
                    min="1"
                    max="5000"
                    value={String(vehicleForm.tankCapacity)}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, tankCapacity: Number(e.target.value) })}
                    required
                  />
                </FormField>
              </div>

              <FormField label="Daily Max Limit in Liters (Optional)" htmlFor="dailyLimitLiters" description="Leave blank for no limit">
                <TextInput
                  id="dailyLimitLiters"
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={vehicleForm.dailyLimitLiters}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, dailyLimitLiters: e.target.value })}
                />
              </FormField>

              {vehicleError && <p className="text-destructive text-xs font-medium">{vehicleError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowVehicleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={vehicleSubmitting} className="font-semibold shadow-xs">
                  {vehicleSubmitting ? "Registering…" : "Register Vehicle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: ADD DRIVER ──────────────────────────────────────────── */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HugeiconsIcon icon={UserGroupIcon} size={16} strokeWidth={2} />
                </div>
                <h3 className="text-sm font-bold text-foreground">Register Authorized Driver</h3>
              </div>
              <button
                onClick={() => setShowDriverModal(false)}
                className="text-muted-foreground hover:text-foreground size-7 flex items-center justify-center rounded-lg hover:bg-muted text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDriver} className="space-y-3.5 text-xs">
              <FormField label="Full Name" htmlFor="driverName" description="Driver's legal name" required>
                <TextInput
                  id="driverName"
                  value={driverForm.fullName}
                  onChange={(e) => setDriverForm({ ...driverForm, fullName: e.target.value })}
                  placeholder="e.g. Ibrahim Musa"
                  required
                />
              </FormField>

              <FormField label="Phone Number" htmlFor="driverPhone" description="For SMS notification & verification" required>
                <TextInput
                  id="driverPhone"
                  type="tel"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  placeholder="e.g. 08012345678"
                  required
                />
              </FormField>

              <FormField label="Driver's License / Staff ID" htmlFor="licenseNumber" description="Optional identification number">
                <TextInput
                  id="licenseNumber"
                  value={driverForm.licenseNumber}
                  onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                  placeholder="e.g. DL-98234-A"
                />
              </FormField>

              {driverError && <p className="text-destructive text-xs font-medium">{driverError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDriverModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={driverSubmitting} className="font-semibold shadow-xs">
                  {driverSubmitting ? "Registering…" : "Register Driver"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
