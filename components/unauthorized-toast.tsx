"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

function UnauthorizedToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    if (error === "unauthorized") {
      toast.error("No permission to access");
    } else if (error === "no_access") {
      toast.error("You don't have access to any modules. Contact your administrator.");
    } else {
      return;
    }

    // Remove the query parameter from the URL without reloading the page
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.delete("error");
    const newUrl = pathname + (newParams.toString() ? `?${newParams.toString()}` : "");
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}

export function UnauthorizedToast() {
  return (
    <Suspense fallback={null}>
      <UnauthorizedToastInner />
    </Suspense>
  );
}
