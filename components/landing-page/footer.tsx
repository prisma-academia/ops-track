"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { COMPANY_EMAIL, COMPANY_NAME, COMPANY_PHONE, COMPANY_PHONE_TEL } from "@/lib/branding";
import { PoweredBy } from "@/components/brand/powered-by";
import { StoreButtons } from "@/components/landing-page/store-buttons";

export default function Footer() {
  const footerLinks = [
    { label: "Home", href: "/" },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQs", href: "/#faq" },
    { label: "Register", href: "/auth/register" },
    { label: "Platform sign in", href: "/auth/login" },
    { label: "Fleet", href: "/auth/login" },
    { label: "Stations", href: "/auth/login" },
    { label: "Download app", href: "/#download" },
  ];

  return (
    <footer className="dark bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 md:py-24 py-8">
        <div className="flex flex-col gap-16">
          <div className="flex flex-col gap-12">
            <div className="grid grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both">
              <div className="col-span-12 md:col-span-3">
                <p className="w-full text-foreground">
                  Get product updates on fleet, stations, transport, and tank operations.
                </p>
              </div>
              <div className="md:col-span-1" />
              <div className="col-span-12 md:col-span-8">
                <div className="flex flex-col lg:flex-row gap-5 lg:gap-10">
                  <form
                    className="flex gap-2 flex-1"
                    onSubmit={(event) => event.preventDefault()}
                  >
                    <Input
                      required
                      type="email"
                      name="email"
                      placeholder="enter your email"
                      className="rounded-full h-full py-2 text-white"
                    />
                    <Button
                      type="submit"
                      className="h-auto py-2 px-4 rounded-full cursor-pointer font-medium hover:bg-primary/80"
                    >
                      Subscribe
                    </Button>
                  </form>
                  <p className="text-sm flex-1 text-foreground">
                    By subscribing, you agree to receive OpsTrack updates. You can unsubscribe at any time.
                  </p>
                </div>
              </div>
            </div>
            <Separator />
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-7 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both">
              <h2 className="sm:text-5xl text-3xl font-medium mb-6 text-foreground">
                Ready to run fleet and station operations in one place?
              </h2>
              <div className="flex flex-col items-start gap-4">
                <Button asChild className="py-3.5 px-6 rounded-full bg-teal-400 hover:bg-teal-400/80 h-auto">
                  <a href="/auth/register">Get started</a>
                </Button>
                <StoreButtons href="#" />
              </div>
            </div>
            <div className="md:col-span-1" />
            <div className="col-span-12 md:col-span-2 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-100 ease-in-out fill-mode-both">
              <div className="flex flex-col gap-4">
                {footerLinks.slice(0, 4).map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-base text-muted-foreground hover:text-primary"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-2 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 ease-in-out fill-mode-both">
              <div className="flex flex-col gap-4">
                {footerLinks.slice(4, 8).map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block text-base text-muted-foreground hover:text-primary"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-12">
            <Separator />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300 ease-in-out fill-mode-both">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">
                  ©{new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <a href={`tel:${COMPANY_PHONE_TEL}`} className="hover:text-primary">
                    {COMPANY_PHONE}
                  </a>
                  <a href={`mailto:${COMPANY_EMAIL}`} className="hover:text-primary">
                    {COMPANY_EMAIL}
                  </a>
                </div>
              </div>
              <PoweredBy className="items-start sm:items-end text-muted-foreground" labelClassName="text-xs font-medium mb-1" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
