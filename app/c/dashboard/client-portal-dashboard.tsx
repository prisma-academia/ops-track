"use client";

import { useState } from "react";
import { apiPost, apiDelete } from "@/lib/client/api";
import { Card } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormField, TextInput } from "@/components/form-field";
import {
  Building2,
  Car,
  Users,
  Fuel,
  CreditCard,
  MapPin,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Trash2,
} from "lucide-react";

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

  return (
    <div className="space-y-6">
      {/* Financial Status Header Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-5 rounded-xl border border-border bg-card shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Corporate Account
            </span>
            <Badge
              variant={client.billingModel === "PREPAID" ? "default" : "secondary"}
              className={
                client.billingModel === "PREPAID"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
              }
            >
              {client.billingModel}
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {client.companyName || client.email}
          </h2>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
            <span>Primary Station Network: <strong className="text-foreground">{tenantName}</strong></span>
            <span>Permitted Branches: <strong className="text-foreground">{client.allowedStations?.length || 0}</strong></span>
            <span>Registered Fleet: <strong className="text-foreground">{vehicles.length} Vehicles</strong></span>
            <span>Authorized Drivers: <strong className="text-foreground">{drivers.length} Drivers</strong></span>
          </div>
        </div>

        {/* Balance & Paystack Top-Up Card */}
        <div className="p-5 rounded-xl border border-border bg-gradient-to-br from-card to-muted/20 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {client.billingModel === "PREPAID" ? "Available Deposit Balance" : "Outstanding Fuel Debt"}
            </span>
            <div className="text-2xl font-bold font-mono text-foreground mt-1">
              ₦
              {client.billingModel === "PREPAID"
                ? Number(client.depositBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })
                : Number(client.outstandingDebt).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            {client.billingModel === "POSTPAID" && (
              <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                Approved Credit Limit: ₦{Number(client.creditLimit).toLocaleString()}
              </div>
            )}
          </div>

          <div>
            {client.billingModel === "PREPAID" ? (
              <Button
                onClick={() => setShowTopUpModal(true)}
                className="w-full gap-2 text-xs"
                size="sm"
              >
                <Plus className="size-3.5" />
                Fund Wallet with Paystack
              </Button>
            ) : (
              <Button
                onClick={() => setShowTopUpModal(true)}
                variant="outline"
                className="w-full gap-2 text-xs"
                size="sm"
              >
                <CreditCard className="size-3.5" />
                Settle Debt via Paystack
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto text-sm">
        {[
          { key: "overview", label: "Fleet Summary", icon: Building2 },
          { key: "stations", label: `Permitted Branches (${client.allowedStations?.length || 0})`, icon: MapPin },
          { key: "vehicles", label: `Fleet Vehicles (${vehicles.length})`, icon: Car },
          { key: "drivers", label: `Authorized Drivers (${drivers.length})`, icon: Users },
          { key: "orders", label: `Fuel Consumption (${client.fuelOrders?.length || 0})`, icon: Fuel },
          { key: "ledger", label: "Wallet Ledger", icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 1. OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Corporate Account Details</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Company Name</span>
                <span className="font-medium text-foreground">{client.companyName || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Corporate Email</span>
                <span className="font-medium text-foreground">{client.email}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Contact Person</span>
                <span className="font-medium text-foreground">{client.contactPerson || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Phone Number</span>
                <span className="font-medium text-foreground">{client.phone || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Authorization Mode</span>
                <span className="font-medium text-foreground">
                  {client.approvalRequirement === "MANAGER_ONLY"
                    ? "Station Manager Verification"
                    : "Client Admin Real-Time Approval"}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Fleet Fueling Policy</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Payment Processor</span>
                <span className="font-medium text-foreground">Paystack (Direct Settlement)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Billing Cycle</span>
                <span className="font-medium text-foreground">Every {client.billingCycleDays || 30} Days</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Interest / Penalty Fee</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">0% (None)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Daily Max Volume Limit</span>
                <span className="font-medium text-foreground">
                  {client.dailyMaxLiters ? `${client.dailyMaxLiters} Liters/Day` : "Unlimited"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 2. PERMITTED BRANCHES */}
      {activeTab === "stations" && (
        <Card className="p-5 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Authorized Station Branches</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your drivers can only collect fuel at these approved branches within the {tenantName} network.
            </p>
          </div>

          {client.allowedStations?.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No specific station branches configured. Contact station operations to assign branch access.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {client.allowedStations.map((acc: any) => {
                const st = acc.station;
                return (
                  <div key={st.id} className="p-3.5 rounded-lg border border-border bg-card flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm text-foreground">{st.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{st.code}</div>
                      {st.location && <div className="text-[11px] text-muted-foreground mt-1">{st.location}</div>}
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                      Approved
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* 3. FLEET VEHICLES */}
      {activeTab === "vehicles" && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Registered Fleet Vehicles</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicles authorized to dispense fuel at assigned station branches.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowVehicleModal(true)}
              className="gap-1.5 text-xs self-start sm:self-auto"
            >
              <Plus className="size-3.5" />
              Add Vehicle
            </Button>
          </div>

          {vehicles.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Car className="size-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-xs text-muted-foreground">No vehicles registered yet.</p>
              <Button size="sm" variant="outline" onClick={() => setShowVehicleModal(true)} className="text-xs gap-1.5">
                <Plus className="size-3.5" /> Add First Vehicle
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2 px-3">Plate Number</th>
                    <th className="py-2 px-3">Make / Model</th>
                    <th className="py-2 px-3">Fuel Type</th>
                    <th className="py-2 px-3">Tank Capacity</th>
                    <th className="py-2 px-3">Daily Limit</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {vehicles.map((v: any) => (
                    <tr key={v.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">{v.plateNumber}</td>
                      <td className="py-2.5 px-3">{v.makeModel || "—"}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {v.fuelType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{v.tankCapacity} Liters</td>
                      <td className="py-2.5 px-3 font-mono">{v.dailyLimitLiters ? `${v.dailyLimitLiters} L` : "None"}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteVehicle(v.id)}
                          title="Remove vehicle"
                        >
                          <Trash2 className="size-3.5" />
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

      {/* 4. AUTHORIZED DRIVERS */}
      {activeTab === "drivers" && (
        <Card className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Authorized Fleet Drivers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personnel permitted to collect fuel on behalf of your company.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowDriverModal(true)}
              className="gap-1.5 text-xs self-start sm:self-auto"
            >
              <Plus className="size-3.5" />
              Add Driver
            </Button>
          </div>

          {drivers.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Users className="size-8 mx-auto text-muted-foreground opacity-40" />
              <p className="text-xs text-muted-foreground">No drivers registered yet.</p>
              <Button size="sm" variant="outline" onClick={() => setShowDriverModal(true)} className="text-xs gap-1.5">
                <Plus className="size-3.5" /> Add First Driver
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2 px-3">Driver Name</th>
                    <th className="py-2 px-3">Phone Number</th>
                    <th className="py-2 px-3">License / Staff ID</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {drivers.map((d: any) => (
                    <tr key={d.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-semibold text-foreground">{d.fullName}</td>
                      <td className="py-2.5 px-3 font-mono">{d.phone}</td>
                      <td className="py-2.5 px-3 font-mono">{d.licenseNumber || "—"}</td>
                      <td className="py-2.5 px-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteDriver(d.id)}
                          title="Remove driver"
                        >
                          <Trash2 className="size-3.5" />
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

      {/* 5. ORDERS HISTORY */}
      {activeTab === "orders" && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Fuel Dispense History</h3>
          {client.fuelOrders?.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No fuel dispenses recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Station Branch</th>
                    <th className="py-2 px-3">Vehicle</th>
                    <th className="py-2 px-3">Driver</th>
                    <th className="py-2 px-3">Volume</th>
                    <th className="py-2 px-3">Price/L</th>
                    <th className="py-2 px-3">Total Amount</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {client.fuelOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(o.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{o.station?.name}</td>
                      <td className="py-2.5 px-3 font-mono">{o.vehicle?.plateNumber}</td>
                      <td className="py-2.5 px-3">{o.driver?.fullName}</td>
                      <td className="py-2.5 px-3 font-mono">{o.liters} L ({o.productType})</td>
                      <td className="py-2.5 px-3 font-mono">₦{o.pricePerLiter}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        ₦{Number(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
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

      {/* 6. WALLET LEDGER */}
      {activeTab === "ledger" && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Financial Transactions & Top-Ups</h3>
          {client.walletLedgers?.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No ledger transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {client.walletLedgers.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px]">
                          {l.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold">
                        ₦{Number(l.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">{l.description || l.reference || "—"}</td>
                      <td className="py-2.5 px-3 font-mono">
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

      {/* MODAL: TOP-UP VIA PAYSTACK */}
      {showTopUpModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-foreground">
                {client.billingModel === "PREPAID" ? "Fund Prepaid Deposit" : "Settle Outstanding Debt"}
              </h3>
              <button onClick={() => setShowTopUpModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
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

              {fundError && <p className="text-rose-600 text-xs">{fundError}</p>}

              <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-muted-foreground">
                You will be redirected to the secure Paystack checkout to pay via Card, USSD, or Bank Transfer.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowTopUpModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={funding}>
                  {funding ? "Connecting to Paystack…" : "Proceed to Paystack"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD VEHICLE */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Car className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Register Fleet Vehicle</h3>
              </div>
              <button onClick={() => setShowVehicleModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
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
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
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

              {vehicleError && <p className="text-rose-600 text-xs font-medium">{vehicleError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowVehicleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={vehicleSubmitting}>
                  {vehicleSubmitting ? "Registering…" : "Register Vehicle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DRIVER */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Register Authorized Driver</h3>
              </div>
              <button onClick={() => setShowDriverModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
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

              {driverError && <p className="text-rose-600 text-xs font-medium">{driverError}</p>}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDriverModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={driverSubmitting}>
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
