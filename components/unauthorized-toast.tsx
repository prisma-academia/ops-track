"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

function UnauthorizedToastInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("error") === "unauthorized") {
      toast.error("No permission to access");
      
      // Remove the query parameter from the URL without reloading the page
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("error");
      const newUrl = pathname + (newParams.toString() ? `?${newParams.toString()}` : "");
      router.replace(newUrl, { scroll: false });
    }
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
