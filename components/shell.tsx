import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";

export type NavItem = { href: string; label: string };

export function AppShell({
  title,
  nav,
  userLabel,
  logoutEndpoint,
  logoutRedirect,
  logoutContext = "client",
  children,
}: {
  title: string;
  nav: NavItem[];
  userLabel: string;
  logoutEndpoint: string;
  logoutRedirect: string;
  logoutContext?: "platform" | "tenant-admin" | "client";
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1">
      <aside className="w-64 shrink-0 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-6">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400">{title}</div>
          <div className="mt-1 text-sm text-stone-700 dark:text-stone-300">{userLabel}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8">
          <LogoutButton
            endpoint={logoutEndpoint}
            postLogoutPath={logoutRedirect}
            logoutContext={logoutContext}
          />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950/60 text-foreground p-6 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
