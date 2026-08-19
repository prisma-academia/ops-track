export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        {children}
      </div>
    </div>
  );
}
