"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Moon,
  Sun,
  Zap,
  BarChart3,
  Shield,
  Globe,
  Sparkles,
  Star,
  ChevronDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Currency selector                                                  */
/* ------------------------------------------------------------------ */
const CURRENCIES = [
  { code: "NGN", symbol: "₦", label: "Naira" },
  { code: "USD", symbol: "$", label: "Dollar" },
  { code: "GBP", symbol: "£", label: "Pound" },
  { code: "EUR", symbol: "€", label: "Euro" },
];

function CurrencySelector() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(CURRENCIES[0]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 cursor-pointer"
      >
        <span className="font-medium">{selected.symbol}</span>
        <span>{selected.code}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-white/10 bg-neutral-900 shadow-xl">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                setSelected(c);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/10 cursor-pointer ${
                selected.code === c.code
                  ? "bg-white/5 text-white"
                  : "text-white/70"
              }`}
            >
              <span className="font-medium">{c.symbol}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
function AuthHeader() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";

  return (
    <header className="absolute inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Left — Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 transition-all group-hover:bg-white/15">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-white tracking-tight hidden sm:inline">
            Rafuel
          </span>
        </a>

        {/* Right — Controls */}
        <div className="flex items-center gap-3">
          <CurrencySelector />
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 cursor-pointer"
          >
            <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Feature highlights (left side)                                     */
/* ------------------------------------------------------------------ */
function LeftInfoSection() {
  return (
    <div className="flex flex-col h-full w-full justify-between pt-10">
      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6 mt-10">
        {/* Logo */}
        <a href="/" className="flex items-center justify-center group mb-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 transition-all group-hover:bg-white/15">
            <Zap className="h-7 w-7 text-white" />
          </div>
        </a>

        {/* Stars */}
        <div className="flex items-center gap-1.5">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-white text-white" />
          ))}
        </div>
        
        {/* Quote */}
        <h2 className="text-xl font-bold tracking-tight text-white lg:text-2xl text-center leading-[1.35] max-w-lg">
          &ldquo;The best login pages disappear.<br />This one already feels fast.&rdquo;
        </h2>
        
        {/* Author */}
        <div className="flex items-center gap-3 mt-6">
          <img 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100&auto=format&fit=crop" 
            alt="Sean Bold" 
            className="h-10 w-10 rounded-full object-cover border border-white/10" 
          />
          <div className="text-left">
            <p className="text-base font-semibold text-white leading-tight">Sean Bold</p>
            <p className="text-sm text-white/50 mt-0.5 font-medium">Co-founder &bull; ReUI</p>
          </div>
        </div>
      </div>

      {/* Bottom Logos */}
      <div className="pb-8 mt-12 w-full">
        <p className="text-[15px] font-semibold text-white mb-2">Powered By</p>
        <div className="flex items-center gap-6 text-white flex-wrap">
          {/* OpenAI */}
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-[22px] w-[22px]">
              <path d="M22.28 11.23a7.27 7.27 0 0 0-1.04-4.83 7.37 7.37 0 0 0-5.87-3.5 7.25 7.25 0 0 0-4.04-1.2 7.25 7.25 0 0 0-4.04 1.2 7.37 7.37 0 0 0-5.87 3.5 7.27 7.27 0 0 0-1.04 4.83 7.27 7.27 0 0 0 1.04 4.83 7.37 7.37 0 0 0 5.87 3.5 7.25 7.25 0 0 0 4.04 1.2 7.25 7.25 0 0 0 4.04-1.2 7.37 7.37 0 0 0 5.87-3.5 7.27 7.27 0 0 0 1.04-4.83zm-10.28 9.3c-2.3 0-4.32-1.3-5.38-3.18h7.97c2.46 0 4.45-2 4.45-4.46V8.14l1.24.71c.72.42 1.17 1.2 1.17 2.03 0 2.92-2.36 5.28-5.28 5.28h-4.17v4.37zm-7.6-5.46c-1.15-2-1.15-4.36 0-6.36l1.24.72v7.97c0 2.46 2 4.45 4.46 4.45h3.76v1.44c-.72.42-1.57.54-2.42.34-2.58-.62-4.52-2.9-4.87-5.56H3.6c.15-.36.5-.72.8-1zm14.16-5.63v7.97l-1.24.71V10.8a4.46 4.46 0 0 0-4.46-4.45H6.96V4.9c.72-.42 1.57-.54 2.42-.34 2.58.62 4.52 2.9 4.87 5.56h4.15v-1.44c-.16.36-.5.73-.8 1h1.24v-.25z"/>
            </svg>
            <span className="font-medium text-sm tracking-tight">PrismaForge</span>
          </div>
         
        </div>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Main signup form page                                              */
/* ------------------------------------------------------------------ */
const SignupForm = () => {
  return (
    <section className="bg-foreground dark:bg-background relative min-h-screen flex flex-col">
      {/* Background decorations — PRESERVED */}
      <div className="pointer-events-none absolute inset-0 right-0 overflow-hidden md:block hidden">
        {/* Outer big circle */}
        <div className="absolute left-1/1 top-0 h-650 w-650 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10" />
        {/* Inner circle */}
        <div className="absolute left-1/1 top-0 h-175 w-175 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground dark:bg-background" />
      </div>

      {/* Main content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pt-14 pb-10 lg:px-8">
        <div className="grid w-full gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-24">
          {/* Left — Info Section (hidden on mobile, shown before form on tablet) */}
          <div className="hidden lg:flex">
            <LeftInfoSection />
          </div>

          {/* Right — Form Card (PRESERVED) */}
          <div className="flex items-center justify-center lg:justify-end">
            <Card className="w-full max-w-lg px-6 py-8 sm:p-12 relative gap-6">
              <CardHeader className="text-center gap-6 p-0">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-2xl font-medium text-card-foreground">
                    Welcome to Shadcn Space
                  </CardTitle>
                  <CardDescription className="text-sm text-muted-foreground font-normal">
                    Login to your account now
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <form>
                  <FieldGroup className="gap-6">
                    <Field className="grid md:grid-cols-2 md:gap-6 gap-3">
                      <Button
                        variant="outline"
                        type="button"
                        className="text-sm text-medium text-card-foreground gap-2 dark:bg-background rounded-lg h-9 shadow-xs cursor-pointer"
                      >
                        <img
                          src="https://images.shadcnspace.com/assets/svgs/icon-google.svg"
                          alt="google icon"
                          className="h-4 w-4"
                        />
                        Sign in with Google
                      </Button>
                      <Button
                        variant="outline"
                        type="button"
                        className="text-sm text-medium text-card-foreground gap-2 dark:bg-background rounded-lg h-9 shadow-xs cursor-pointer"
                      >
                        <img
                          src="https://images.shadcnspace.com/assets/svgs/icon-github.svg"
                          alt="github icon"
                          className="dark:hidden  h-4 w-4"
                        />
                        <img
                          src="https://images.shadcnspace.com/assets/svgs/icon-github-white.svg"
                          alt="github icon"
                          className="hidden dark:block  h-4 w-4"
                        />
                        Sign in with Github
                      </Button>
                    </Field>
                    <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card text-sm text-muted-foreground bg-transparent">
                      <span className="px-4">or sign in with</span>
                    </FieldSeparator>

                    <div className="flex flex-col gap-4">
                      <Field className="gap-1.5">
                        <FieldLabel
                          htmlFor="email"
                          className="text-sm text-muted-foreground font-normal"
                        >
                          Email*
                        </FieldLabel>
                        <Input
                          id="email"
                          type="email"
                          placeholder="example@shadcnspace.com"
                          required
                          className="dark:bg-background h-9 shadow-xs"
                        />
                      </Field>
                      <Field className="gap-1.5">
                        <FieldLabel
                          htmlFor="password"
                          className="text-sm text-muted-foreground font-normal"
                        >
                          Password*
                        </FieldLabel>

                        <Input
                          id="password"
                          type="password"
                          placeholder="Enter your password"
                          required
                          className="dark:bg-background h-9 shadow-xs"
                        />
                      </Field>
                    </div>

                    <Field orientation="horizontal" className="justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="terms"
                          defaultChecked
                          className="cursor-pointer"
                        />
                        <FieldLabel
                          htmlFor="terms"
                          className="text-sm text-primary font-normal cursor-pointer"
                        >
                          Remember this device
                        </FieldLabel>
                      </div>
                      <a
                        href="#"
                        className="text-sm text-card-foreground font-medium text-end"
                      >
                        Forgot password?
                      </a>
                    </Field>

                    <Field className="gap-4">
                      <Button
                        type="submit"
                        size={"lg"}
                        className="rounded-lg h-10 hover:bg-primary/80 cursor-pointer"
                      >
                        Sign in
                      </Button>
                      {/* <FieldDescription className="text-center text-sm font-normal text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <a
                          href="#"
                          className="font-medium text-card-foreground no-underline!"
                        >
                          Create an account
                        </a>
                      </FieldDescription> */}
                    </Field>
                  </FieldGroup>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      {/* <AuthFooter /> */}
    </section>
  );
};

export default SignupForm;
