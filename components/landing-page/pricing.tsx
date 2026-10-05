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
