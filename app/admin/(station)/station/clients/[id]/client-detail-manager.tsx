"use client";

import { FormField, TextInput } from "@/components/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiDelete, apiPost, apiPut } from "@/lib/client/api";
import {
    Activity,
    Building2,
    Car,
    Check,
    CreditCard,
    Fuel,
    MapPin,
    Plus,
    Trash2,
    Users
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ClientDetailProps {
  client: any;
  allStations: Array<{ id: string; name: string; code: string; location: string | null; state: string | null }>;
}

type ClientDashboardOrder = {
  id: string;
  productType: string;
  liters: number;
  totalAmount: number;
  createdAt: string;
  status: string;
  station?: { name: string } | null;
};

type ClientDashboardLedgerEntry = {
  id: string;
  description: string | null;
  reference: string | null;
  type: string;
  amount: number;
  createdAt: string;
};

export function ClientDetailManager({ client: initialClient, allStations }: ClientDetailProps) {
  const router = useRouter();
  const [client, setClient] = useState(initialClient);
  const [activeTab, setActiveTab] = useState<"overview" | "stations" | "vehicles" | "drivers" | "orders" | "ledger">("overview");
  const balanceValue = client.billingModel === "PREPAID"
    ? Number(client.depositBalance)
    : Number(client.outstandingDebt);
  const creditHeadroom = Math.max(0, Number(client.creditLimit) - Number(client.outstandingDebt));
  const dashboardOrders = (client.fuelOrders || []) as ClientDashboardOrder[];
  const recentOrders = dashboardOrders.slice(0, 5);
  const recentLedgerEntries = (client.walletLedgers || []) as ClientDashboardLedgerEntry[];
  const productVolumes = dashboardOrders.reduce((totals: Record<string, number>, order) => {
    totals[order.productType] = (totals[order.productType] || 0) + Number(order.liters);
    return totals;
  }, {} as Record<string, number>);
  const maxProductVolume = (Object.values(productVolumes) as number[]).reduce(
    (max: number, volume) => Math.max(max, volume),
    1
  );

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

  // Station Branch Editing State
  const [isEditingStations, setIsEditingStations] = useState(false);
  const [selectedStationIds, setSelectedStationIds] = useState<string[]>(
    client.allowedStations?.map((s: any) => s.stationId || s.station?.id) || []
  );
  const [savingStations, setSavingStations] = useState(false);

  // Handle Add Vehicle
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setVehicleSubmitting(true);
    setVehicleError(null);

    const payload = {
      plateNumber: vehicleForm.plateNumber,
      makeModel: vehicleForm.makeModel || null,
      fuelType: vehicleForm.fuelType,
      tankCapacity: Number(vehicleForm.tankCapacity),
      dailyLimitLiters: vehicleForm.dailyLimitLiters ? Number(vehicleForm.dailyLimitLiters) : null,
    };

    const res = await apiPost<{ vehicle: any }>(`/api/tenant/clients/${client.id}/vehicles`, payload);
    setVehicleSubmitting(false);

    if (res.error) {
      setVehicleError(res.error.message);
      return;
    }

    if (res.data?.vehicle) {
      const newVehicle = res.data.vehicle;
      setClient((prev: any) => ({
        ...prev,
        vehicles: [newVehicle, ...(prev.vehicles || [])],
      }));
      setShowVehicleModal(false);
      setVehicleForm({
        plateNumber: "",
        makeModel: "",
        fuelType: "AGO",
        tankCapacity: 70,
        dailyLimitLiters: "",
      });
      router.refresh();
    }
  };

  // Handle Delete Vehicle
  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Are you sure you want to remove or deactivate this vehicle?")) return;
    const res = await apiDelete(`/api/tenant/clients/${client.id}/vehicles/${vehicleId}`);
    if (res.error) {
      alert(res.error.message);
      return;
    }
    setClient((prev: any) => ({
      ...prev,
      vehicles: prev.vehicles.filter((v: any) => v.id !== vehicleId),
    }));
    router.refresh();
  };

  // Handle Add Driver
  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setDriverSubmitting(true);
    setDriverError(null);

    const res = await apiPost<{ driver: any }>(`/api/tenant/clients/${client.id}/drivers`, driverForm);
    setDriverSubmitting(false);

    if (res.error) {
      setDriverError(res.error.message);
      return;
    }

    if (res.data?.driver) {
      const newDriver = res.data.driver;
      setClient((prev: any) => ({
        ...prev,
        drivers: [newDriver, ...(prev.drivers || [])],
      }));
      setShowDriverModal(false);
      setDriverForm({ fullName: "", phone: "", licenseNumber: "" });
      router.refresh();
    }
  };

  // Handle Delete Driver
  const handleDeleteDriver = async (driverId: string) => {
    if (!confirm("Are you sure you want to remove or deactivate this driver?")) return;
    const res = await apiDelete(`/api/tenant/clients/${client.id}/drivers/${driverId}`);
    if (res.error) {
      alert(res.error.message);
      return;
    }
    setClient((prev: any) => ({
      ...prev,
      drivers: prev.drivers.filter((d: any) => d.id !== driverId),
    }));
    router.refresh();
  };

  // Handle Save Station Branches
  const handleSaveStations = async () => {
    setSavingStations(true);
    const res = await apiPut(`/api/tenant/clients/${client.id}/stations`, {
      stationIds: selectedStationIds,
    });
    setSavingStations(false);

    if (res.error) {
      alert(res.error.message);
      return;
    }

    const updatedAllowed = allStations
      .filter((s) => selectedStationIds.includes(s.id))
      .map((s) => ({ stationId: s.id, station: s }));

    setClient((prev: any) => ({
      ...prev,
      allowedStations: updatedAllowed,
    }));
    setIsEditingStations(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-3 xl:grid-cols-[1.1fr_1.2fr_1fr]">
        <Card className="flex min-h-40 flex-col justify-between p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {client.billingModel === "PREPAID" ? "Available balance" : "Outstanding balance"}
            </p>
            <Badge variant={client.billingModel === "PREPAID" ? "default" : "secondary"}>
              {client.billingModel}
            </Badge>
          </div>
          <div>
            <p className="mt-3 text-2xl font-semibold tabular-nums text-foreground">
              ₦{balanceValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {client.billingModel === "PREPAID"
                ? "Client wallet deposit"
                : `Credit limit ₦${Number(client.creditLimit).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </p>
          </div>
          {client.billingModel === "POSTPAID" && (
            <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
              Available headroom <span className="font-semibold text-foreground">₦{creditHeadroom.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
        </Card>

        <Card className="flex min-h-40 flex-col justify-between p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Building2 className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-foreground">
                  {client.companyName || "Corporate Client"}
                </h2>
                <Badge variant={client.status === "ACTIVE" ? "outline" : "destructive"}>
                  {client.status}
                </Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">{client.email}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {[client.contactPerson, client.phone].filter(Boolean).join(" · ") || "No contact person recorded"}
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <span>Billing every {client.billingCycleDays || 30} days</span>
            <span>{client.allowedStations?.length || 0} permitted stations</span>
          </div>
        </Card>

        <Card className="flex min-h-40 flex-col justify-between p-4">
          <p className="text-xs font-medium text-muted-foreground">Client footprint</p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              { label: "Vehicles", value: client.vehicles?.length || 0, icon: Car },
              { label: "Drivers", value: client.drivers?.length || 0, icon: Users },
              { label: "Stations", value: client.allowedStations?.length || 0, icon: MapPin },
              { label: "Recent orders", value: client.fuelOrders?.length || 0, icon: Fuel },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-primary" />
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="ml-auto text-sm font-semibold tabular-nums text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent fuel orders</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Latest client dispensing activity</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setActiveTab("orders")}>
              View all
            </Button>
          </div>
          {recentOrders.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentOrders.map((order) => (
                <li key={order.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted">
                    <Image
                      src="/assets/icons/fuel-station.png"
                      alt=""
                      width={32}
                      height={32}
                      className="size-6 object-contain"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {order.station?.name || "Station dispense"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {order.productType} · {Number(order.liters).toLocaleString()} L · {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">
                      ₦{Number(order.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">{order.status}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No fuel orders recorded yet.</p>
          )}
        </Card>

        <div className="grid gap-4">
          <Card className="p-4">
            <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Product mix</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Liters across the latest {client.fuelOrders?.length || 0} orders</p>
              </div>
              <Activity className="size-4 text-primary" />
            </div>
            <div className="mt-3 space-y-3">
              {(["PMS", "AGO", "DPK", "LPG"] as const).map((product) => {
                const volume = productVolumes[product] || 0
                return (
                  <div key={product} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3">
                    <span className="text-xs font-medium text-muted-foreground">{product}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(volume > 0 ? 3 : 0, (volume / maxProductVolume) * 100)}%` }}
                      />
                    </span>
                    <span className="min-w-16 text-right text-xs font-medium tabular-nums text-foreground">
                      {volume.toLocaleString()} L
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Wallet activity</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Latest account transactions</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("ledger")}>
                View ledger
              </Button>
            </div>
            {recentLedgerEntries.length > 0 ? (
              <ul className="divide-y divide-border">
                {recentLedgerEntries.slice(0, 3).map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {entry.description || entry.reference || entry.type}
                      </span>
                      <span className="block text-[11px] text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                      ₦{Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-5 text-center text-xs text-muted-foreground">No wallet activity recorded.</p>
            )}
          </Card>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-1 overflow-x-auto text-sm">
        {[
          { key: "overview", label: "Overview & Policy", icon: Building2 },
          { key: "stations", label: `Allowed Branches (${client.allowedStations?.length || 0})`, icon: MapPin },
          { key: "vehicles", label: `Vehicles (${client.vehicles?.length || 0})`, icon: Car },
          { key: "drivers", label: `Drivers (${client.drivers?.length || 0})`, icon: Users },
          { key: "orders", label: `Fuel Orders (${client.fuelOrders?.length || 0})`, icon: Fuel },
          { key: "ledger", label: "Ledger", icon: CreditCard },
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

      {/* TAB CONTENT */}

      {/* 1. OVERVIEW & POLICY */}
      {activeTab === "overview" && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Client Configuration Summary</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-muted-foreground">Company Name</dt>
              <dd className="font-medium text-foreground mt-0.5">{client.companyName || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Official Email</dt>
              <dd className="font-medium text-foreground mt-0.5">{client.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Account Billing Model</dt>
              <dd className="font-medium text-foreground mt-0.5">{client.billingModel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Billing Cycle</dt>
              <dd className="font-medium text-foreground mt-0.5">Every {client.billingCycleDays || 30} Days</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Station Authorization Policy</dt>
              <dd className="font-medium text-foreground mt-0.5">
                {client.approvalRequirement === "MANAGER_ONLY"
                  ? "Station Manager signs off directly at the pump"
                  : "Requires real-time Client Fleet Admin approval"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Global Daily Max Volume</dt>
              <dd className="font-medium text-foreground mt-0.5">
                {client.dailyMaxLiters ? `${client.dailyMaxLiters} Liters` : "No limit"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium text-foreground mt-0.5">{client.address || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Registered At</dt>
              <dd className="font-medium text-foreground mt-0.5">{new Date(client.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </Card>
      )}

      {/* 2. ALLOWED STATION BRANCHES */}
      {activeTab === "stations" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Permitted Station Branches</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drivers can only be verified and dispensed fuel at these specific station branches.
              </p>
            </div>
            {!isEditingStations ? (
              <Button size="sm" variant="outline" onClick={() => setIsEditingStations(true)}>
                Modify Branches
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditingStations(false)} disabled={savingStations}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveStations} disabled={savingStations}>
                  {savingStations ? "Saving…" : "Save Branches"}
                </Button>
              </div>
            )}
          </div>

          {!isEditingStations ? (
            client.allowedStations?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">
                No station branches permitted yet. Click "Modify Branches" to grant branch access.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {client.allowedStations.map((access: any) => {
                  const st = access.station;
                  return (
                    <div key={st.id} className="p-3 rounded-lg border border-border bg-card flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm text-foreground">{st.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{st.code}</div>
                        {st.location && <div className="text-[11px] text-muted-foreground mt-1">{st.location}</div>}
                      </div>
                      <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">
                        Authorized
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {allStations.map((st) => {
                  const isSelected = selectedStationIds.includes(st.id);
                  return (
                    <div
                      key={st.id}
                      onClick={() =>
                        setSelectedStationIds((prev) =>
                          prev.includes(st.id) ? prev.filter((id) => id !== st.id) : [...prev, st.id]
                        )
                      }
                      className={`flex items-center justify-between p-3 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{st.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{st.code}</div>
                      </div>
                      <div
                        className={`size-4 rounded flex items-center justify-center border ${
                          isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 3. FLEET VEHICLES */}
      {activeTab === "vehicles" && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Registered Fleet Vehicles</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Vehicles authorized to take fuel under this corporate account.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowVehicleModal(true)} className="gap-1.5">
              <Plus className="size-3.5" />
              Add Vehicle
            </Button>
          </div>

          {client.vehicles?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No vehicles registered yet. Click "Add Vehicle" to register this client's fleet.
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
                  {client.vehicles.map((v: any) => (
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
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remove vehicle"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
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
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Authorized Drivers</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personnel verified by the Station Manager before dispensing.
              </p>
            </div>
            <Button size="sm" onClick={() => setShowDriverModal(true)} className="gap-1.5">
              <Plus className="size-3.5" />
              Add Driver
            </Button>
          </div>

          {client.drivers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No drivers registered yet. Click "Add Driver" to register drivers for this organization.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {client.drivers.map((d: any) => (
                <div key={d.id} className="p-3.5 rounded-lg border border-border bg-card flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm text-foreground">{d.fullName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{d.phone}</div>
                    {d.licenseNumber && (
                      <div className="text-[10px] text-muted-foreground font-mono mt-1">Lic: {d.licenseNumber}</div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteDriver(d.id)}
                    className="text-rose-500 hover:text-rose-700 p-1"
                    title="Remove driver"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* 5. FUEL DISPENSE ORDERS */}
      {activeTab === "orders" && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Recent Fuel Dispense Records</h3>
          {client.fuelOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No fuel dispenses recorded for this client yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Branch</th>
                    <th className="py-2 px-3">Vehicle</th>
                    <th className="py-2 px-3">Driver</th>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">Liters</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Manager Sign-off</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {client.fuelOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono">{new Date(o.createdAt).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-medium text-foreground">{o.station?.name || "—"}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">{o.vehicle?.plateNumber}</td>
                      <td className="py-2.5 px-3">{o.driver?.fullName}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {o.productType}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{Number(o.liters).toLocaleString()} L</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-foreground">
                        ₦{Number(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground">
                        {o.manager ? `${o.manager.firstName || ""} ${o.manager.lastName || ""}`.trim() || o.manager.email : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 6. FINANCIAL WALLET LEDGER */}
      {activeTab === "ledger" && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Financial Account Ledger</h3>
          {client.walletLedgers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-xs">
              No transactions recorded in the wallet ledger yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {client.walletLedgers.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/30">
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">
                        {new Date(l.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {l.type}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate">{l.description || l.reference || "—"}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        ₦{Number(l.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-foreground">
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

      {/* MODAL: ADD VEHICLE */}
      {showVehicleModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-foreground">Register Fleet Vehicle</h3>
              <button onClick={() => setShowVehicleModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleAddVehicle} className="space-y-3 text-xs">
              <FormField label="Plate Number" htmlFor="plateNumber" required>
                <TextInput
                  id="plateNumber"
                  placeholder="e.g. ABC-123-XY"
                  value={vehicleForm.plateNumber}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plateNumber: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Make / Model (Optional)" htmlFor="makeModel">
                <TextInput
                  id="makeModel"
                  placeholder="e.g. Toyota Hilux / Mack Truck"
                  value={vehicleForm.makeModel}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, makeModel: e.target.value })}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Fuel Type" htmlFor="fuelType">
                  <select
                    id="fuelType"
                    value={vehicleForm.fuelType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value as any })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                  >
                    <option value="PMS">PMS (Petrol)</option>
                    <option value="AGO">AGO (Diesel)</option>
                    <option value="DPK">DPK (Kerosene)</option>
                  </select>
                </FormField>

                <FormField label="Tank Capacity (Liters)" htmlFor="tankCapacity" description="Maximum tank volume" required>
                  <TextInput
                    id="tankCapacity"
                    type="number"
                    min="10"
                    max="5000"
                    value={vehicleForm.tankCapacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, tankCapacity: Number(e.target.value) })}
                    required
                  />
                </FormField>
              </div>

              <FormField label="Daily Max Limit (Liters, Optional)" htmlFor="dailyLimitLiters">
                <TextInput
                  id="dailyLimitLiters"
                  type="number"
                  placeholder="Unlimited"
                  value={vehicleForm.dailyLimitLiters}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, dailyLimitLiters: e.target.value })}
                />
              </FormField>

              {vehicleError && <p className="text-rose-600 text-xs">{vehicleError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowVehicleModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={vehicleSubmitting}>
                  {vehicleSubmitting ? "Adding…" : "Add Vehicle"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD DRIVER */}
      {showDriverModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-foreground">Register Authorized Driver</h3>
              <button onClick={() => setShowDriverModal(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <form onSubmit={handleAddDriver} className="space-y-3 text-xs">
              <FormField label="Driver Full Name" htmlFor="driverName" required>
                <TextInput
                  id="driverName"
                  placeholder="e.g. Ibrahim Musa"
                  value={driverForm.fullName}
                  onChange={(e) => setDriverForm({ ...driverForm, fullName: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Phone Number" htmlFor="driverPhone" required>
                <TextInput
                  id="driverPhone"
                  placeholder="+234 801 234 5678"
                  value={driverForm.phone}
                  onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                  required
                />
              </FormField>

              <FormField label="Driver License Number (Optional)" htmlFor="driverLicense">
                <TextInput
                  id="driverLicense"
                  placeholder="DL-98765432"
                  value={driverForm.licenseNumber}
                  onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                />
              </FormField>

              {driverError && <p className="text-rose-600 text-xs">{driverError}</p>}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDriverModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={driverSubmitting}>
                  {driverSubmitting ? "Adding…" : "Add Driver"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
