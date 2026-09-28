"use client";

import { useState } from "react";
import { apiPost } from "@/lib/client/api";
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
} from "lucide-react";

interface ClientPortalDashboardProps {
  client: any;
  tenantName: string;
}

export function ClientPortalDashboard({ client, tenantName }: ClientPortalDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "stations" | "vehicles" | "orders" | "ledger">("overview");

  // Top-Up Modal State
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("50000");
  const [funding, setFunding] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

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
            <span>Registered Fleet: <strong className="text-foreground">{client.vehicles?.length || 0} Vehicles</strong></span>
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
          { key: "vehicles", label: `Fleet Vehicles (${client.vehicles?.length || 0})`, icon: Car },
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
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Registered Vehicles</h3>
          {client.vehicles?.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No vehicles registered yet.</div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 4. ORDERS HISTORY */}
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
                    <th className="py-2 px-3">Branch</th>
                    <th className="py-2 px-3">Vehicle</th>
                    <th className="py-2 px-3">Driver</th>
                    <th className="py-2 px-3">Product</th>
                    <th className="py-2 px-3">Liters</th>
                    <th className="py-2 px-3 text-right">Amount</th>
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
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                        ₦{Number(o.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 5. LEDGER */}
      {activeTab === "ledger" && (
        <Card className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground border-b pb-2">Financial Account Activity</h3>
          {client.walletLedgers?.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">No ledger transactions yet.</div>
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
    </div>
  );
}
