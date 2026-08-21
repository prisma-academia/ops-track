"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { generateRandomPassword, validatePolicy } from "@/lib/auth/password-policy";
import { Ban, KeyRound, Pencil, RefreshCw, ShieldAlert } from "lucide-react";

export function UserSecurityCard({
  userId,
  email,
  isOwner,
  status,
  bannedReason,
  resetPasswordEndpoint,
  onEditPermissions,
}: {
  userId: string;
  email: string;
  isOwner: boolean;
  status: "ACTIVE" | "SUSPENDED";
  bannedReason: string | null;
  resetPasswordEndpoint: string;
  onEditPermissions?: () => void;
}) {
  const router = useRouter();
  const isBanned = status === "SUSPENDED";

  const [resetOpen, setResetOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);
  const [resetPending, setResetPending] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [iconSpin, setIconSpin] = useState(0);

  const [banOpen, setBanOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banPending, setBanPending] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function openReset() {
    setPassword("");
    setRevokeSessions(true);
    setSendEmail(true);
    setResetError(null);
    setIconSpin(0);
    setResetOpen(true);
  }

  function fillGeneratedPassword() {
    setPassword(generateRandomPassword());
    setResetError(null);
    setIconSpin((n) => n + 1);
  }

  async function confirmReset() {
    const policy = validatePolicy(password);
    if (!policy.ok) {
      setResetError(policy.reason);
      return;
    }
    setResetPending(true);
    setResetError(null);
    setInfo(null);
    const res = await apiPost(resetPasswordEndpoint, {
      password,
      revokeSessions,
      sendEmail,
    });
    setResetPending(false);
    if (res.error) {
      setResetError(res.error.message);
      return;
    }
    setResetOpen(false);
    setPassword("");
    const parts = ["Password updated."];
    if (revokeSessions) parts.push("The user was signed out of active sessions.");
    if (sendEmail) parts.push(`A notification was sent to ${email}.`);
    setInfo(parts.join(" "));
    router.refresh();
  }

  async function confirmBan() {
    const reason = banReason.trim();
    if (reason.length < 3) {
      setBanError("Enter a reason (at least 3 characters).");
      return;
    }
    setBanPending(true);
    setBanError(null);
    setInfo(null);
    const res = await apiPost(`/api/tenant/users/${userId}/ban`, { reason });
    setBanPending(false);
    if (res.error) {
      setBanError(res.error.message);
      return;
    }
    setBanOpen(false);
    setBanReason("");
    setInfo("User banned. They can no longer sign in.");
    router.refresh();
  }

  async function confirmUnban() {
    if (!confirm("Restore this user's access?")) return;
    setBanPending(true);
    setBanError(null);
    setInfo(null);
    const res = await apiPost(`/api/tenant/users/${userId}/unban`, {});
    setBanPending(false);
    if (res.error) {
      setBanError(res.error.message);
      return;
    }
    setInfo("User restored. They can sign in again.");
    router.refresh();
  }

  return (
    <>
      <Card className="border-border/40 shadow-sm h-full">
        <CardHeader className="pb-4 border-b border-border/40">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
            Account actions
          </CardTitle>
          <CardDescription className="text-xs">
            Reset credentials or restrict access for this user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {info && (
            <p className="text-xs rounded-md border border-green-200 bg-green-50/50 p-2 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400">
              {info}
            </p>
          )}
          {isBanned && bannedReason && (
            <p className="text-xs rounded-md border border-red-200 bg-red-50/50 p-2 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
              Banned: {bannedReason}
            </p>
          )}
          {onEditPermissions && (
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start gap-2"
              onClick={onEditPermissions}
            >
              <Pencil className="h-4 w-4" />
              Edit permissions
            </Button>
          )}
          <Button variant="outline" size="lg" className="w-full justify-start gap-2" onClick={openReset}>
            <KeyRound className="h-4 w-4" />
            Reset password
          </Button>
          {isOwner ? (
            <p className="text-xs text-muted-foreground">The owner account cannot be banned.</p>
          ) : isBanned ? (
            <Button
              variant="outline"
              size="lg"
              className="w-full justify-start gap-2"
              onClick={confirmUnban}
              disabled={banPending}
            >
              {banPending ? "Restoring…" : "Restore user"}
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              className="w-full justify-start gap-2"
              onClick={() => {
                setBanReason("");
                setBanError(null);
                setBanOpen(true);
              }}
            >
              <Ban className="h-4 w-4" />
              Ban user
            </Button>
          )}
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for <span className="font-bold">{email}</span>. They will need to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type="text"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-24 font-mono text-sm"
                  placeholder="At least 12 characters"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 inset-y-0 my-auto h-7 gap-1 px-2 text-xs transition-none active:translate-y-0"
                  onClick={fillGeneratedPassword}
                >
                  <RefreshCw
                    key={iconSpin}
                    className={`h-3 w-3 ${iconSpin > 0 ? "animate-[spin_0.45s_linear]" : ""}`}
                  />
                  Generate
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Must include upper and lowercase letters, a number, and a symbol.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={revokeSessions}
                onCheckedChange={(v) => setRevokeSessions(v === true)}
                className="mt-0.5"
              />
              <span>Log the user out of all active sessions</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={sendEmail}
                onCheckedChange={(v) => setSendEmail(v === true)}
                className="mt-0.5"
              />
              <span>Email the new password to User</span>
            </label>
            {resetError && <p className="text-sm text-destructive">{resetError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetPending}>
              Cancel
            </Button>
            <Button onClick={confirmReset} disabled={resetPending || !password}>
              {resetPending ? "Saving…" : "Confirm reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ban user</DialogTitle>
            <DialogDescription>
              {email} will be signed out immediately and will not be able to log in until restored.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="ban-reason">Reason</Label>
              <Textarea
                id="ban-reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Why is this account being banned?"
                rows={4}
              />
            </div>
            {banError && <p className="text-sm text-destructive">{banError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanOpen(false)} disabled={banPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBan} disabled={banPending || banReason.trim().length < 3}>
              {banPending ? "Banning…" : "Confirm ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
