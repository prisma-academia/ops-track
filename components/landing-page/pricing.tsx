"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  COMPANY_EMAIL,
  COMPANY_PHONE,
  COMPANY_PHONE_TEL,
} from "@/lib/branding";
import { cn } from "@/lib/utils";
import { Check, Mail, Phone } from "lucide-react";

const coverage = [
  { image: "/assets/icons/oil-industry.png", label: "Oil Industries" },
  { image: "/assets/icons/fuel-truck.png", label: "Transporters" },
  { image: "/assets/icons/route.png", label: "Routes" },
  { image: "/assets/icons/fuel-station.png", label: "Filling Stations" },
];

const plans = [
  {
    image: "/assets/icons/fuel-station.png",
    name: "Station",
    fit: "One filling station, or a small group",
    summary: "Pump, tank, and shift work for the station floor.",
    points: [
      "Tank dipping and stock variance",
      "Attendant shifts and cash declarations",
      "Expenses with receipt capture",
      "Offline recording on the mobile app",
    ],
  },
  {
    image: "/assets/icons/fuel-truck.png",
    name: "Fleet",
    fit: "Transporters and planned routes",
    summary: "Dispatch, waybills, and route visibility from depot to station.",
    points: [
      "Truck dispatch and load tracking",
      "Waybills and delivery confirmation",
      "Route and trip status",
      "Handoff with the receiving station",
    ],
    featured: true,
  },
  {
    image: "/assets/icons/oil-industry.png",
    name: "Network",
    fit: "Oil industries running both sides",
    summary: "Stations, fleet, routes, and tanks in one workspace.",
    points: [
      "Everything in Station and Fleet",
      "Multi-station headquarters view",
      "Role-based access for each team",
      "Sized to your stations, trucks, and tanks",
    ],
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-10 sm:gap-14">
        <div className="flex flex-col gap-6 items-center text-center">
          <div className="flex flex-col gap-4 items-center">
            <Badge
              variant="outline"
              className="text-sm h-auto py-1 px-3 border-0 outline outline-border"
            >
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-medium max-w-2xl">
              Plans that follow how you operate
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl leading-relaxed">
              Every quote is set to your footprint. A single filling station and a full oil network are not forced onto the same plan.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
            {coverage.map((item) => (
              <div
                key={item.label}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-muted/40 px-3 py-4"
              >
                <img
                  src={item.image}
                  alt=""
                  width={40}
                  height={40}
                  className="size-10 object-contain dark:invert"
                />
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "h-full rounded-2xl border bg-muted/40 shadow-none ring-0 py-0 gap-0",
                plan.featured && "border-primary bg-card ring-1 ring-primary"
              )}
            >
              <CardHeader className="gap-4 px-6 pt-6 pb-0">
                <div className="flex items-start justify-between gap-3">
                  <img
                    src={plan.image}
                    alt=""
                    width={40}
                    height={40}
                    className="size-10 object-contain dark:invert"
                  />
                  {plan.featured ? (
                    <Badge className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                      Most chosen
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-2xl font-medium text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.fit}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-medium text-foreground">Custom</p>
                  <p className="text-sm text-muted-foreground">per operation</p>
                </div>
              </CardHeader>
              <CardContent className="px-6 pt-5 pb-0 flex flex-col gap-5 flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {plan.summary}
                </p>
                <ul className="flex flex-col gap-3">
                  {plan.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="px-6 pt-6 pb-6 mt-auto">
                <Button
                  asChild
                  variant={plan.featured ? "default" : "outline"}
                  className={cn(
                    "w-full rounded-full h-auto py-2.5 font-medium cursor-pointer",
                    !plan.featured && "bg-background hover:bg-accent"
                  )}
                >
                  <a href="/auth/register">Get started</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-muted/40 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 max-w-xl">
              <h3 className="text-xl sm:text-2xl font-medium text-foreground">
                Tell us your station and fleet size
              </h3>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Share how many stations, trucks, and tanks you run. We&apos;ll send a plan that matches, and walk through the mobile app if you want a closer look.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:shrink-0">
              <Button
                asChild
                className="rounded-full h-auto py-2.5 px-5 justify-center gap-2 font-medium cursor-pointer"
              >
                <a href={`tel:${COMPANY_PHONE_TEL}`}>
                  <Phone className="size-4" />
                  {COMPANY_PHONE}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full h-auto py-2.5 px-5 justify-center gap-2 font-medium bg-background hover:bg-accent cursor-pointer"
              >
                <a href={`mailto:${COMPANY_EMAIL}?subject=OpsTrack%20Pricing%20Inquiry`}>
                  <Mail className="size-4" />
                  Email us
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
