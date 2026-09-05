"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu, Moon, Phone, Sun, X } from 'lucide-react'
import { Separator } from '@/components/ui/separator';
import { motion, useInView } from "motion/react";
import { useTheme } from "next-themes";
import { CompanyLogo } from "@/components/brand/company-logo";
import { COMPANY_EMAIL, COMPANY_PHONE, COMPANY_PHONE_TEL } from "@/lib/branding";

type navData = {
  name: string;
  href: string;
};

type NavbarProps = {
  navData: navData[]
}

export type NavLinkItem = {
  name: string
  label?: string
  href: string
  isActive?: boolean
}

export interface NavLinkProps {
  item: NavLinkItem
}

const NavLink: React.FC<NavLinkProps> = ({
  item,
}) => {

  return (
    <li className="flex items-center group w-fit cursor-pointer">
      <div className={`h-0.5 bg-primary transition-all duration-300 ${item.isActive ? 'w-6 mr-4' : 'w-0 group-hover:w-6 group-hover:mr-4'}`} />
      <a
        href={item.href}
        className={`text-2xl font-medium rounded-full transition-colors ${item.isActive ? 'text-primary' : "text-muted-foreground group-hover:text-primary"}`}
      >
        {item.name}
      </a>
    </li>
  )
}

const Navbar: React.FC<NavbarProps> = ({ navData }) => {
  const [sticky, setSticky] = useState(false);
  const [navbarOpen, setNavbarOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const isInView = useInView(headerRef, { once: true, amount: 0.1 });
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = theme === "dark" || resolvedTheme === "dark";

  const themeToggleClass = sticky
    ? "text-foreground hover:bg-muted border-border bg-background"
    : "text-white hover:bg-white/10 border-white/50 bg-white/10";

  const handleScroll = useCallback(() => {
    setSticky(window.scrollY >= 50);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [handleScroll]);

  return (
    <motion.header
      ref={headerRef}
      initial={{ opacity: 0, y: -32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: -32 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      className={cn(
        "z-50 w-full bg-transparent h-20 sticky top-0 flex items-center"
      )}
    >
      <nav
        className={`max-w-7xl mx-auto sm:px-16 px-4 w-full`}>
        <div className={`flex items-center justify-between duration-300 ${sticky
          ? 'shadow-lg bg-background rounded-full p-3'
          : 'shadow-none px-0'
          }`}>
          <div className='flex justify-between items-center gap-2 w-full'>
            <div>
              <a href="/" className="flex items-center gap-2 shrink-0">
                <CompanyLogo
                  href={null}
                  variant="banner"
                  onLightSurface={sticky}
                  imgClassName="h-10 w-auto max-h-10"
                />
              </a>
            </div>

            <div className='flex items-center gap-2 sm:gap-6'>
              <div className={`hidden md:block`}>
                <a
                  href={`tel:${COMPANY_PHONE_TEL}`}
                  className={`text-sm text-inherit flex items-center gap-2 ${sticky
                    ? 'text-foreground hover:text-primary border-white/50 dark:border-white/50'
                    : 'text-white hover:text-white/80 border-white/50 dark:border-white/50'
                    }`}>
                  <Phone size={20} />
                  {COMPANY_PHONE}
                </a>
              </div>
              <Separator orientation="vertical" className={`h-5 my-auto sm:block hidden ${sticky ? "bg-white/50 dark:bg-white/50" : "bg-white/50 dark:bg-white/50"}`} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className={`relative size-10 rounded-full border ${themeToggleClass}`}
                aria-label="Toggle dark mode"
              >
                <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <div>
                <Button
                  size={"lg"}
                  onClick={() => setNavbarOpen(!navbarOpen)}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-full hover:cursor-pointer border text-sm font-medium h-auto ${sticky
                    ? 'text-dark dark:text-white bg-background dark:hover:text-white dark:hover:bg-background hover:text-dark hover:bg-white border-dark dark:border-white'
                    : 'text-black bg-white dark:text-dark hover:bg-transparent hover:text-white border-white'
                    }`}
                  aria-label='Toggle mobile menu'>
                  <Menu size={16} />
                  Menu
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

        <Sheet open={navbarOpen} onOpenChange={setNavbarOpen}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="bg-background p-6 overflow-auto no-scrollbar border-none flex flex-col gap-12"
          >
            {/* Header / Close Button */}
            <SheetHeader>
              <SheetTitle className='sr-only'>Navigation Menu</SheetTitle>
              <SheetClose className='absolute top-4 right-4 rounded-full dark:bg-white bg-black dark:text-black text-white p-2 cursor-pointer'>
                <X size={24} />
              </SheetClose>
            </SheetHeader>

            {/* Navigation */}
            <nav>
              <ul className='flex flex-col gap-4'>
                {navData?.map((item, index) => (
                  <SheetClose key={index} className="w-fit">
                    <NavLink item={item} />
                  </SheetClose>
                ))}
              </ul>
            </nav>

            {/* Contact & Socials */}
            <div className="flex flex-col gap-12 text-foreground">
              {/* Contact */}
              <div className="flex flex-col gap-1">
                <p className="text-lg font-normal text-muted-foreground">
                  Contact
                </p>
                <a href={`mailto:${COMPANY_EMAIL}`} className="text-base font-medium hover:text-primary">
                  {COMPANY_EMAIL}
                </a>
                <a href={`tel:${COMPANY_PHONE_TEL}`} className="text-base font-medium hover:text-primary">
                  {COMPANY_PHONE}
                </a>
              </div>

              <button
                type="button"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="flex w-fit items-center gap-2 text-base font-medium text-foreground hover:text-primary"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                {isDark ? "Light mode" : "Dark mode"}
              </button>

              {/* Socials */}
              <div className="flex flex-col gap-1">
                <p className="text-lg font-normal text-muted-foreground">
                  Socials
                </p>
                <a href="#" className="text-base font-medium hover:text-primary">
                  X / Twitter
                </a>
                <a href="#" className="text-base font-medium hover:text-primary">
                  Facebook
                </a>
                <a href="#" className="text-base font-medium hover:text-primary">
                  Instagram
                </a>
              </div>
            </div>
          </SheetContent>
        </Sheet>
    </motion.header>
  );
};

export default Navbar
