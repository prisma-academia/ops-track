"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, Fuel, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STEPS = ["Your Company", "Contact Details", "What You Need"] as const;
const COMPANY_SIZES = ["1–10", "11–50", "51–200", "200+"];
const INDUSTRIES = ["Fuel Retail", "Transport & Logistics", "Fleet Management", "Other"];
const COUNTRIES = ["Nigeria","Ghana","Kenya","South Africa","Uganda","Tanzania","Rwanda","Ethiopia","Other"];

export default function BookADemoPage() {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    companyName: "", industry: "", companySize: "", country: "",
    contactName: "", email: "", phone: "",
    interestedIn: [] as string[], numStations: "", numFleet: "", message: "",
    _hp: "",
  });

  function set(key: keyof typeof form, value: string | string[]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function toggleInterest(val: string) {
    set("interestedIn", form.interestedIn.includes(val)
      ? form.interestedIn.filter((v) => v !== val)
      : [...form.interestedIn, val]);
  }

  async function submit() {
    setSubmitting(true);
    const res = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName:  form.companyName,
        contactName:  form.contactName,
        email:        form.email,
        phone:        form.phone || undefined,
        companySize:  form.companySize || undefined,
        industry:     form.industry || undefined,
        country:      form.country || undefined,
        interestedIn: form.interestedIn,
        message:      form.message || undefined,
        _hp:          form._hp,
      }),
    });
    setSubmitting(false);
    if (res.ok) { setSubmitted(true); return; }
    const data = await res.json().catch(() => null);
    alert(data?.error?.message ?? "Something went wrong. Please try again.");
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle2 className="size-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold">We have received your request!</h1>
          <p className="text-muted-foreground">Our team will be in touch within <strong>1 business day</strong> to schedule your demo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
            <Fuel className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-sm">OpsTrack</span>
        </div>
        <p className="text-xs text-muted-foreground">Book a Demo</p>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Step {step + 1} of {STEPS.length}</span>
              <span>{STEPS[step]}</span>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= step ? "bg-primary" : "bg-muted")} />
              ))}
            </div>
          </div>

          {/* Honeypot */}
          <input type="text" name="_hp" value={form._hp} onChange={(e) => set("_hp", e.target.value)} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

          {/* Step 0 — Company */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Tell us about your company</h1>
                <p className="text-muted-foreground text-sm mt-1">We will personalise your demo based on your needs.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company name <span className="text-destructive">*</span></Label>
                <Input id="companyName" placeholder="Acme Fuel Ltd." value={form.companyName} onChange={(e) => set("companyName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="industry">Industry</Label>
                <select id="industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Select…</option>
                  {INDUSTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="companySize">Company size</Label>
                  <select id="companySize" value={form.companySize} onChange={(e) => set("companySize", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select…</option>
                    {COMPANY_SIZES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                  <select id="country" value={form.country} onChange={(e) => set("country", e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select…</option>
                    {COUNTRIES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <Button className="w-full" disabled={!form.companyName || !form.country} onClick={() => setStep(1)}>Next</Button>
            </div>
          )}

          {/* Step 1 — Contact */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">Your contact details</h1>
                <p className="text-muted-foreground text-sm mt-1">So we know how to reach you.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contactName">Your full name <span className="text-destructive">*</span></Label>
                <Input id="contactName" placeholder="John Doe" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email <span className="text-destructive">*</span></Label>
                <Input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" placeholder="+234 800 000 0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(0)}>Back</Button>
                <Button className="flex-1" disabled={!form.contactName || !form.email} onClick={() => setStep(2)}>Next</Button>
              </div>
            </div>
          )}

          {/* Step 2 — Needs */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-bold">What do you need?</h1>
                <p className="text-muted-foreground text-sm mt-1">Help us prepare the right demo for you.</p>
              </div>
              <div className="space-y-2">
                <Label>Interested in <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "STATION", label: "Station Management", icon: Fuel },
                    { id: "FLEET",   label: "Fleet Management",   icon: Truck },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleInterest(id)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
                        form.interestedIn.includes(id)
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/60 hover:border-border"
                      )}
                    >
                      <Icon className={cn("size-5", form.interestedIn.includes(id) ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="numStations">No. of stations</Label>
                  <Input id="numStations" type="number" min={0} placeholder="e.g. 3" value={form.numStations} onChange={(e) => set("numStations", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numFleet">No. of trucks</Label>
                  <Input id="numFleet" type="number" min={0} placeholder="e.g. 12" value={form.numFleet} onChange={(e) => set("numFleet", e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Tell us more</Label>
                <Textarea id="message" placeholder="Describe your current workflow and what you are hoping to improve…" value={form.message} onChange={(e) => set("message", e.target.value)} rows={3} className="resize-none text-sm" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                <Button className="flex-1" disabled={form.interestedIn.length === 0 || submitting} onClick={submit}>
                  {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                  Request Demo
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}