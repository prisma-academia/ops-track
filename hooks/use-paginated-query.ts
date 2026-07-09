import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/client/api";
import type { PaginatedEnvelope } from "@/lib/api/pagination-types";

interface UsePaginatedQueryOptions {
  baseUrl: string;
  initialPage?: number;
  initialPageSize?: number;
  additionalParams?: Record<string, string>;
  syncWithUrl?: boolean;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({
  baseUrl,
  initialPage = 1,
  initialPageSize = 25,
  additionalParams = {},
  syncWithUrl = true,
  enabled = true,
}: UsePaginatedQueryOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If syncWithUrl is true, prioritize URL params for initial state
  const urlPage = syncWithUrl ? parseInt(searchParams.get("page") || "0", 10) : 0;
  const urlPageSize = syncWithUrl ? parseInt(searchParams.get("take") || "0", 10) : 0;

  const [page, setPageState] = useState(urlPage > 0 ? urlPage : initialPage);
  const [pageSize, setPageSizeState] = useState(urlPageSize > 0 ? urlPageSize : initialPageSize);

  const [data, setData] = useState<T[]>([]);
  const [meta, setMeta] = useState({
    page,
    pageSize,
    totalCount: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of mounted state to avoid setting state after unmount.
  // A ref is used instead of state because: (1) it avoids the cascading-render
  // warning from calling setState synchronously in an effect, and (2) it gives
  // a live mutable value that async callbacks can read without stale closures.
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const serializedParams = useMemo(
    () => JSON.stringify(additionalParams),
    [additionalParams]
  );

  const fetchPage = useCallback(async (currentPage: number, currentTake: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = new URL(baseUrl, window.location.origin);
      url.searchParams.set("page", currentPage.toString());
      url.searchParams.set("take", currentTake.toString());

      Object.entries(additionalParams).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });

      const res = await apiGet<PaginatedEnvelope<T>>(url.pathname + url.search);

      if (!isMountedRef.current) return;

      if (res.error) {
        setError(res.error.message);
      } else if (res.data) {
        // At runtime, res is { data: T[], error: null, meta: PageMeta }
        setData(res.data as unknown as T[]);
        const resMeta = (res as any).meta;
        if (resMeta) {
          setMeta((prev) => ({ ...prev, ...resMeta }));
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) setError(err.message || "Failed to fetch data");
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [baseUrl, serializedParams]);

  useEffect(() => {
    if (enabled) {
      fetchPage(page, pageSize);
    }
  }, [fetchPage, page, pageSize, enabled]);

  const setPage = (newPage: number) => {
    setPageState(newPage);
    if (syncWithUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  const setPageSize = (newTake: number) => {
    setPageSizeState(newTake);
    // Reset to page 1 when changing page size
    setPageState(1);
    
    if (syncWithUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      params.set("take", newTake.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  // Helper to pre-fill initial data when passed from server component
  const setInitialData = (initialData: T[], initialMeta: any) => {
    if (data.length === 0 && !isLoading) {
      setData(initialData);
      setMeta(initialMeta);
    }
  };

  const refresh = () => {
    fetchPage(page, pageSize);
  };

  return {
    data,
    meta,
    isLoading,
    error,
    setPage,
    setPageSize,
    refresh,
    setInitialData, // For SSR hydration
  };
}
