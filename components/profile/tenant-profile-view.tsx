"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  User,
  Phone,
  Lock,
  Building2,
  Shield,
  ShieldCheck,
  Calendar,
  Clock,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Fuel,
  Truck,
  Check,
  Building,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { FormField } from "@/components/form-field";
import { apiPatch } from "@/lib/client/api";

export interface TenantProfileData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  otherName: string | null;
  phone: string | null;
  isOwner: boolean;
  status: "ACTIVE" | "SUSPENDED";
  bannedReason?: string | null;
  activeModules: string[];
  stationPermissions: string[];
  fleetPermissions: string[];
  failedLoginAttempts: number;
  lockedUntil: string | Date | null;
  createdAt: string | Date;
  lastLoginAt: string | Date | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    companyEmail?: string | null;
    companyPhone?: string | null;
    activeModules?: string[];
  } | null;
  organization?: {
    id: string;
    name: string;
    slug: string | null;
    type: string | null;
  } | null;
  stations?: {
    id: string;
    name: string;
    code: string;
  }[];
}

interface TenantProfileViewProps {
  initialUser: TenantProfileData;
}

export function TenantProfileView({ initialUser }: TenantProfileViewProps) {
  const [user, setUser] = useState<TenantProfileData>(initialUser);

  // Phone state
  const [phone, setPhone] = useState(initialUser.phone ?? "");
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Password reset state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const fullName = [user.firstName, user.lastName, user.otherName]
    .filter(Boolean)
    .join(" ")
    .trim() || user.email;

  // Password criteria
  const hasMinLength = newPassword.length >= 12;
  const hasLower = /[a-z]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPolicySatisfied = hasMinLength && hasLower && hasUpper && hasDigit && hasSymbol;

  const handleUpdatePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPhone(true);
    try {
      const res = await apiPatch<{ user: TenantProfileData }>("/api/tenant/users/me", {
        phone: phone.trim() || null,
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to update phone number");
        return;
      }

      if (res.data?.user) {
        setUser(res.data.user);
        setPhone(res.data.user.phone ?? "");
      }
      toast.success("Phone number updated successfully");
    } catch {
      toast.error("An unexpected error occurred while saving phone number");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please provide your current password");
      return;
    }

    if (!isPolicySatisfied) {
      toast.error("New password does not satisfy the security policy requirements");
      return;
    }

    if (!passwordsMatch) {
      toast.error("New password and confirm password do not match");
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await apiPatch<{ user: TenantProfileData }>("/api/tenant/users/me", {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to update password");
        return;
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("An unexpected error occurred while changing password");
    } finally {
      setIsSavingPassword(false);
    }
  };

  const formatDate = (dateVal: string | Date | null | undefined) => {
    if (!dateVal) return "Never";
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Profile Overview Header Card */}
      <Card className="border-border/40 shadow-xs overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary/15 via-primary/5 to-muted border-b border-border/30" />
        <CardContent className="pt-0 relative px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12">
            <div className="flex items-end gap-4">
              <Avatar className="size-20 ring-4 ring-background shadow-md border bg-slate-800 text-white text-2xl font-semibold">
                <AvatarFallback className="bg-slate-800 text-white font-bold">
                  {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 mb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{fullName}</h2>
                  <Badge variant={user.status === "ACTIVE" ? "default" : "destructive"}>
                    {user.status}
                  </Badge>
                  {user.isOwner ? (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300/40">
                      Tenant Owner
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-border/60">
                      Staff / Operator
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
              {user.tenant?.name && (
                <Badge variant="outline" className="gap-1.5 py-1 px-2.5 font-normal text-xs bg-muted/30">
                  <Building2 className="size-3.5 text-primary" />
                  <span>{user.tenant.name}</span>
                </Badge>
              )}
              {user.organization?.name && (
                <Badge variant="outline" className="gap-1.5 py-1 px-2.5 font-normal text-xs bg-muted/30">
                  <Building className="size-3.5 text-blue-500" />
                  <span>{user.organization.name}</span>
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Account Information & Editable Phone */}
        <div className="lg:col-span-2 space-y-8">
          {/* Editable Section: Phone Number */}
          <Card className="border-border/40 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2 text-foreground font-semibold text-base">
                <Phone className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">Contact & Phone Number</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Update your primary phone number used for operational dispatch and SMS alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleUpdatePhone} className="space-y-4">
                <FormField
                  label="Phone Number"
                  htmlFor="user-phone"
                >
                  <div className="relative max-w-md">
                    <Input
                      id="user-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Enter a valid international or local phone number (e.g. +234 801 234 5678)
                    </p>
                  </div>
                </FormField>

                <div className="pt-2 flex items-center justify-between max-w-md">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingPhone || phone === (user.phone ?? "")}
                    className="cursor-pointer gap-2"
                  >
                    <Check className="size-4" />
                    {isSavingPhone ? "Saving..." : "Save Phone Number"}
                  </Button>
                  {phone !== (user.phone ?? "") && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhone(user.phone ?? "")}
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Full Account Details (Read-Only) */}
          <Card className="border-border/40 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2 text-foreground font-semibold text-base">
                <User className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">Account Information</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Full system details for your user profile. These administrative fields are managed by tenant administrators.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Address</dt>
                  <dd className="mt-1 font-medium flex items-center gap-2 text-foreground">
                    {user.email}
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                      Verified
                    </Badge>
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Full Name</dt>
                  <dd className="mt-1 text-foreground font-medium">
                    {fullName}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">First Name</dt>
                  <dd className="mt-1 text-foreground">{user.firstName || "—"}</dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Name</dt>
                  <dd className="mt-1 text-foreground">{user.lastName || "—"}</dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Other / Middle Name</dt>
                  <dd className="mt-1 text-foreground">{user.otherName || "—"}</dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenant / Company</dt>
                  <dd className="mt-1 text-foreground font-medium">
                    {user.tenant?.name ?? "—"}
                    {user.tenant?.slug && (
                      <span className="text-xs text-muted-foreground ml-1.5 font-mono">
                        ({user.tenant.slug})
                      </span>
                    )}
                  </dd>
                </div>

                {user.organization && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization / Department</dt>
                    <dd className="mt-1 text-foreground">
                      {user.organization.name}
                      {user.organization.type && (
                        <span className="text-xs text-muted-foreground ml-1.5">
                          [{user.organization.type}]
                        </span>
                      )}
                    </dd>
                  </div>
                )}

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Role</dt>
                  <dd className="mt-1 text-foreground">
                    {user.isOwner ? "Tenant Account Owner" : "Staff Member"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Modules</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {user.activeModules && user.activeModules.length > 0 ? (
                      user.activeModules.map((m) => (
                        <Badge key={m} variant="secondary" className="gap-1 text-xs py-0.5">
                          {m === "STATION" ? <Fuel className="size-3" /> : <Truck className="size-3" />}
                          {m === "STATION" ? "Station Operations" : "Fleet Logistics"}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">No active modules</span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Assigned Stations</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {user.stations && user.stations.length > 0 ? (
                      user.stations.map((st) => (
                        <Badge key={st.id} variant="outline" className="text-xs py-0.5 font-normal">
                          {st.name} ({st.code})
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {user.isOwner ? "All Stations (Unrestricted Owner)" : "No specific station assigned"}
                      </span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account Created</dt>
                  <dd className="mt-1 text-muted-foreground text-xs flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {formatDate(user.createdAt)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Login</dt>
                  <dd className="mt-1 text-muted-foreground text-xs flex items-center gap-1.5">
                    <Clock className="size-3.5" />
                    {formatDate(user.lastLoginAt)}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Granted Permissions</dt>
                  <dd className="mt-1 text-xs text-foreground font-medium flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    {user.isOwner ? (
                      <span>Full Access (All Permissions Granted)</span>
                    ) : (
                      <span>
                        {user.stationPermissions?.length ?? 0} Station / {user.fleetPermissions?.length ?? 0} Fleet permissions
                      </span>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Failed Login Attempts</dt>
                  <dd className="mt-1 text-xs text-foreground">
                    <span className={user.failedLoginAttempts > 0 ? "font-semibold text-amber-600" : "text-muted-foreground"}>
                      {user.failedLoginAttempts} failed attempts
                    </span>
                    {user.lockedUntil && (
                      <span className="text-destructive ml-1">
                        (Locked until {formatDate(user.lockedUntil)})
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Security & Password Reset Form */}
        <div className="space-y-8">
          <Card className="border-border/40 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2 text-foreground font-semibold text-base">
                <KeyRound className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">Change Password</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Reset your account password with confirmation. Enter your current password to authenticate the change.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <FormField label="Current Password" htmlFor="current-pwd" required>
                  <PasswordInput
                    id="current-pwd"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    className="h-9"
                  />
                </FormField>

                <FormField label="New Password" htmlFor="new-pwd" required>
                  <PasswordInput
                    id="new-pwd"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    className="h-9"
                  />
                </FormField>

                <FormField label="Confirm New Password" htmlFor="confirm-pwd" required>
                  <PasswordInput
                    id="confirm-pwd"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    className="h-9"
                  />
                </FormField>

                {/* Password Policy Guidelines */}
                <div className="rounded-md border border-border/40 bg-muted/20 p-3 text-xs space-y-1.5">
                  <p className="font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                    <Shield className="size-3.5 text-primary" />
                    Password Security Policy
                  </p>
                  <div className="flex items-center gap-1.5">
                    {hasMinLength ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                    <span className={hasMinLength ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Minimum 12 characters
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasUpper ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                    <span className={hasUpper ? "text-foreground font-medium" : "text-muted-foreground"}>
                      At least one uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasLower ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                    <span className={hasLower ? "text-foreground font-medium" : "text-muted-foreground"}>
                      At least one lowercase letter (a-z)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasDigit ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                    <span className={hasDigit ? "text-foreground font-medium" : "text-muted-foreground"}>
                      At least one digit (0-9)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasSymbol ? (
                      <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="size-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                    <span className={hasSymbol ? "text-foreground font-medium" : "text-muted-foreground"}>
                      At least one symbol (!@#$%^&*...)
                    </span>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/30 mt-1">
                      {passwordsMatch ? (
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="size-3.5 text-destructive shrink-0" />
                      )}
                      <span className={passwordsMatch ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-destructive font-medium"}>
                        {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSavingPassword || !currentPassword || !isPolicySatisfied || !passwordsMatch}
                  className="w-full cursor-pointer h-10 mt-2 gap-2"
                >
                  <Lock className="size-4" />
                  {isSavingPassword ? "Updating Password..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Security Tip Box */}
          <div className="rounded-lg border border-border/40 bg-muted/10 p-4 text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <AlertCircle className="size-4 text-primary shrink-0" />
              <span>Need other details updated?</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Email addresses, names, and operational roles are centrally managed for governance compliance. Contact your tenant administrator or OpsTrack support to request profile changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
