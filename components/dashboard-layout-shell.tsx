"use client";

import { AppSidebar } from "@/components/sections/app-sidebar";
import HeaderV2 from "@/components/sections/header-v2";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import type { NavItem } from "@/components/sections/main-nav";
import { NavSearchCommand } from "@/components/sections/nav-search-command";
import { PrintCompanyProvider, type PrintCompanyInfo } from "@/components/print/print-company-context";
import { apiPost } from "@/lib/client/api";

interface DashboardLayoutShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  title: string;
  logoUrl?: string | null;
  user: {
    name: string;
    email: string;
  };
  roleLabel: string;
  logoutEndpoint: string;
  logoutRedirect: string;
  logoutContext: "platform" | "tenant-admin" | "client";
  stations?: { id: string; name: string; code: string; organization?: { name: string | null; slug: string | null; logoUrl: string | null; type: string | null } }[];
  tenant?: {
    name: string;
    slug: string;
    logoUrl: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  printCompany?: PrintCompanyInfo;
  activeStationId?: string;
  enabledModules?: string[];
  internalOrganizations?: { id: string; name: string; slug: string | null; logoUrl: string | null }[];
}

export function DashboardLayoutShell({
  children,
  navItems,
  title,
  logoUrl,
  user,
  roleLabel,
  logoutEndpoint,
  logoutRedirect,
  logoutContext,
  stations,
  activeStationId,
  enabledModules,
  internalOrganizations,
  tenant,
  printCompany,
}: DashboardLayoutShellProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [logOutModal, setLogOutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiPost(logoutEndpoint, {}, { headers: { "x-logout-context": logoutContext } });
      window.location.assign(logoutRedirect);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoggingOut(false);
      setLogOutModal(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="relative min-h-screen overflow-hidden bg-background flex w-full">
        <AppSidebar
          items={navItems}
          title={title}
          logoUrl={logoUrl}
          roleLabel={roleLabel}
          userLabel={user.name}
          context={logoutContext}
          enabledModules={enabledModules}
          stations={stations}
          tenant={tenant}
          internalOrganizations={internalOrganizations}
        />

        <SidebarInset className="bg-background overflow-hidden">
          <HeaderV2
            user={{ name: user.name, email: user.email }}
            onSearchClick={() => setSearchOpen(true)}
            onLogout={() => setLogOutModal(true)}
            stations={stations}
            activeStationId={activeStationId}
          />

          <main className="flex-1 p-4 md:p-8 bg-white dark:bg-black h-full">
            <PrintCompanyProvider
              value={
                printCompany ?? {
                  name: tenant?.name ?? title,
                  slug: tenant?.slug ?? null,
                  logoUrl: tenant?.logoUrl ?? logoUrl ?? null,
                  email: tenant?.email ?? null,
                  phone: tenant?.phone ?? null,
                  address: tenant?.address ?? null,
                }
              }
            >
              {children}
            </PrintCompanyProvider>
          </main>

          {/* Controlled AlertDialog */}
          <AlertDialog open={logOutModal} onOpenChange={setLogOutModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-bold text-card-foreground">
                  Do you want to log out?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Your session will be destroyed and you will need to sign in again to access this page.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoggingOut} onClick={() => setLogOutModal(false)}>
                  Cancel
                </AlertDialogCancel>
                <Button onClick={handleLogout} variant={"destructive"} className="text-white" disabled={isLoggingOut}>
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <NavSearchCommand
            open={searchOpen}
            onOpenChange={setSearchOpen}
            navItems={navItems}
          />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
