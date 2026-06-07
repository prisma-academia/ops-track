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
      <aside className="w-64 shrink-0 border-r border-stone-200 bg-white px-4 py-6">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-stone-500">{title}</div>
          <div className="mt-1 text-sm text-stone-700">{userLabel}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded px-3 py-2 text-sm text-stone-700 hover:bg-stone-100"
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
      <h1 className="text-xl font-semibold">{title}</h1>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-stone-200 bg-white p-6 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
