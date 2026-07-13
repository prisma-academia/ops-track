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
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Search,
  Calendar,
  Smile,
  Calculator,
  User,
  CreditCard,
  Settings
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavItem } from "@/components/sections/main-nav";
import { apiPost } from "@/lib/client/api";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

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
  stations?: { id: string; name: string; code: string }[];
  activeStationId?: string;
  enabledModules?: string[];
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
            {children}
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

          {/* Global Search Dialog */}
          <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
            <DialogContent className="p-0 border-none sm:max-w-xl gap-0 rounded-none shadow-lg overflow-hidden" showCloseButton={false}>
              <DialogTitle className="sr-only">Global Search</DialogTitle>
              <Command className="rounded-none">
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 size-4 shrink-0 opacity-50 text-muted-foreground" />
                  <CommandInput
                    placeholder="Type a command or search..."
                    autoFocus
                    className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground border-none"
                  />
                </div>
                <CommandList className="max-h-[300px] p-2">
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="Suggestions">
                    <CommandItem className="flex items-center gap-2.5 cursor-pointer py-2 px-3 hover:bg-muted/50 rounded-none transition-colors">
                      <Calendar className="size-4 text-muted-foreground" />
                      <span>Calendar</span>
                    </CommandItem>
                    <CommandItem className="flex items-center gap-2.5 cursor-pointer py-2 px-3 hover:bg-muted/50 rounded-none transition-colors">
                      <Smile className="size-4 text-muted-foreground" />
                      <span>Search Emoji</span>
                    </CommandItem>
                    <CommandItem className="flex items-center gap-2.5 cursor-pointer py-2 px-3 hover:bg-muted/50 rounded-none opacity-50 pointer-events-none" disabled>
                      <Calculator className="size-4 text-muted-foreground" />
                      <span>Calculator</span>
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Settings">
                    <CommandItem className="flex items-center gap-2.5 cursor-pointer py-2 px-3 hover:bg-muted/50 rounded-none transition-colors">
                      <User className="size-4 text-muted-foreground" />
                      <span>Profile</span>
                      <CommandShortcut>⌘P</CommandShortcut>
                    </CommandItem>
                    <CommandItem className="flex items-center gap-2.5 cursor-pointer py-2 px-3 hover:bg-muted/50 rounded-none transition-colors">
                      <CreditCard className="size-4 text-muted-foreground" />
                      <span>Billing</span>
                      <CommandShortcut>⌘B</CommandShortcut>
                    </CommandItem>
                    <CommandItem className="flex items-center gap-2.5 cursor-pointer py-2 px-3 hover:bg-muted/50 rounded-none transition-colors">
                      <Settings className="size-4 text-muted-foreground" />
                      <span>Settings</span>
                      <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
