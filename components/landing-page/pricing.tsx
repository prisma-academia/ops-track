"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  COMPANY_EMAIL,
  COMPANY_NAME,
  COMPANY_PHONE,
  COMPANY_PHONE_TEL,
} from "@/lib/branding";
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Fuel,
  Mail,
  Phone,
  Sparkles,
  Truck,
} from "lucide-react";
import Link from "next/link";

interface PlanTier {
  id: string;
  name: string;
  badge?: string;
  description: string;
  pricingLabel: string;
  pricingSubtext: string;
  icon: typeof Fuel;
  isPopular?: boolean;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
}

const PRICING_TIERS: PlanTier[] = [
  {
    id: "single-station",
    name: "Independent Station",
    description:
      "For independent filling station operators seeking accurate stock dipping and shift reconciliation.",
    pricingLabel: "Custom Plan",
    pricingSubtext: "Tailored to your tanks and pumps",
    icon: Fuel,
    features: [
      "Up to 1 station location",
      "Tank dipping & automated variance tracking",
      "Pump attendant shifts & meter readings",
      "Offline-first mobile app for station staff",
      "Daily sales & local expense logging",
      "Standard phone & email support",
    ],
    ctaLabel: "Get in Touch",
    ctaHref: "#contact-touch",
  },
  {
    id: "multi-station",
    name: "Multi-Station Network",
    badge: "Most Popular",
    description:
      "For growing petroleum retail chains managing multiple station branches across states.",
    pricingLabel: "Network Plan",
    pricingSubtext: "Volume discounts across your network",
    icon: Building2,
    isPopular: true,
    features: [
      "Unlimited station locations",
      "Centralized multi-station admin dashboard",
      "Live station ledger balance tracking",
      "Granular staff permissions (Owner, Manager, Attendant)",
      "Automated variance & stock loss alerts",
      "Consolidated financial & sales analytics",
      "Priority operational support & training",
    ],
    ctaLabel: "Get in Touch",
    ctaHref: "#contact-touch",
  },
  {
    id: "enterprise-fleet",
    name: "Enterprise & Fleet",
    badge: "End-to-End",
    description:
      "For petroleum transporters, depot operators, and commercial fleets requiring depot-to-pump tracking.",
    pricingLabel: "Enterprise Quote",
    pricingSubtext: "Custom contract & SLA agreement",
    icon: Truck,
    features: [
      "Everything in Multi-Station Network",
      "Full truck fleet dispatch & logistics tracking",
      "Waybill verification with photo & GPS proof",
      "Depot-to-station chain of custody monitoring",
      "Custom role permissions & data isolation",
      "Dedicated account manager & staff onboarding",
      "Custom ERP & accounting export integration",
    ],
    ctaLabel: "Talk to our Team",
    ctaHref: "#contact-touch",
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-12 sm:gap-16">
        {/* Section Header */}
        <div className="flex flex-col gap-4 items-center text-center animate-in fade-in slide-in-from-top-10 duration-1000 delay-100 ease-in-out fill-mode-both">
          <Badge
            variant="outline"
            className="text-sm h-auto py-1 px-3 border-0 outline outline-border"
          >
            Pricing & Plans
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-medium max-w-2xl">
            Transparent plans, tailored to your operations
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
            Every station network and fleet footprint is unique. Contact us for a transparent plan tailored to your station count, tanks, and operational scale.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {PRICING_TIERS.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card
                key={tier.id}
                className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:shadow-lg ${
                  tier.isPopular
                    ? "border-2 border-primary bg-card/60 shadow-md ring-1 ring-primary/20"
                    : "border border-border bg-card/40"
                }`}
              >
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow-sm flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {tier.badge}
                    </span>
                  </div>
                )}

                <div>
                  <CardHeader className="p-0 mb-6">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                    <CardTitle className="text-2xl font-semibold">
                      {tier.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-2 min-h-[40px] leading-relaxed">
                      {tier.description}
                    </CardDescription>
                  </CardHeader>

                  {/* Pricing Callout */}
                  <div className="mb-6 pb-6 border-b border-border/60">
                    <div className="text-3xl font-bold tracking-tight">
                      {tier.pricingLabel}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tier.pricingSubtext}
                    </div>
                  </div>

                  {/* Features List */}
                  <div className="space-y-3 mb-8">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      What&apos;s included
                    </div>
                    <ul className="space-y-2.5">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-foreground/90">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <CardFooter className="p-0 pt-4">
                  <Button
                    asChild
                    variant={tier.isPopular ? "default" : "outline"}
                    className={`w-full rounded-full py-3 h-auto font-medium cursor-pointer text-sm shadow-xs ${
                      tier.isPopular
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "hover:bg-accent"
                    }`}
                  >
                    <a href={tier.ctaHref} className="flex items-center justify-center gap-2">
                      {tier.ctaLabel}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Contact Touchpoint Banner */}
        <div
          id="contact-touch"
          className="rounded-3xl border border-border bg-muted/40 p-8 sm:p-12 transition-all"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 flex flex-col gap-3 text-center lg:text-left items-center lg:items-start">
              <Badge
                variant="outline"
                className="w-fit text-xs font-normal py-0.5 px-2.5 bg-background border-border"
              >
                Get in Touch
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-medium text-foreground">
                Speak directly with our operations specialists
              </h3>
              <p className="text-muted-foreground text-sm sm:text-base max-w-lg leading-relaxed">
                Need a live walkthrough of the mobile app, assistance setting up station tanks, or volume pricing for a fleet of trucks? We&apos;re ready to help.
              </p>
            </div>

            <div className="lg:col-span-5 flex flex-col sm:flex-row lg:flex-col gap-3 w-full">
              <Button
                asChild
                className="w-full rounded-full py-3 h-auto justify-center gap-2 font-medium cursor-pointer"
              >
                <a
                  href="https://calendly.com/opstrack/30min"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Calendar className="w-4 h-4" />
                  Book a 30-min Demo
                </a>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full rounded-full py-3 h-auto justify-center gap-2 font-medium bg-background hover:bg-accent cursor-pointer"
              >
                <a href={`tel:${COMPANY_PHONE_TEL}`}>
                  <Phone className="w-4 h-4" />
                  Call {COMPANY_PHONE}
                </a>
              </Button>

              <Button
                asChild
                variant="ghost"
                className="w-full rounded-full py-3 h-auto justify-center gap-2 font-medium text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <a href={`mailto:${COMPANY_EMAIL}?subject=OpsTrack%20Pricing%20Inquiry`}>
                  <Mail className="w-4 h-4" />
                  Email {COMPANY_EMAIL}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
