import Link from "next/link";
import { Button } from "@/components/ui/button";

export function NoAccessView({
  homeHref,
  homeLabel,
}: {
  homeHref?: string;
  homeLabel?: string;
}) {
  return (
    <main className="flex min-h-[70vh] flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="font-mono text-8xl font-semibold tracking-tighter text-muted-foreground/25 select-none">
          404
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">No access</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          You don&apos;t have permission to view this page. Ask an administrator to grant access if you think this is a
          mistake.
        </p>
        {homeHref && (
          <Button asChild className="mt-8">
            <Link href={homeHref}>{homeLabel ?? "Go back"}</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
