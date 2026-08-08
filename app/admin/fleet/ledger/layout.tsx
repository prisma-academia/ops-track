import { LedgerTabs } from "./ledger-tabs";

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Ledger</h1>
        <p className="text-muted-foreground">Manage and track your fleet's financial records.</p>
      </div>

      <LedgerTabs />

      <div>
        {children}
      </div>
    </div>
  );
}
