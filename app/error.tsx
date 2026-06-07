"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-stone-600">{error.message}</p>
        {error.digest ? (
          <p className="mt-1 font-mono text-xs text-stone-400">ref {error.digest}</p>
        ) : null}
        <div className="mt-4">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
