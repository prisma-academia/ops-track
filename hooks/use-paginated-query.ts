import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet } from "@/lib/client/api";
import type { PaginatedEnvelope } from "@/lib/api/pagination-types";

interface UsePaginatedQueryOptions<T = any> {
  baseUrl: string;
  initialPage?: number;
  initialPageSize?: number;
  initialData?: T[];
  initialMeta?: any;
  additionalParams?: Record<string, string>;
  syncWithUrl?: boolean;
  enabled?: boolean;
}

export function usePaginatedQuery<T>({
  baseUrl,
  initialPage = 1,
  initialPageSize = 25,
  initialData,
  initialMeta,
  additionalParams = {},
  syncWithUrl = true,
  enabled = true,
}: UsePaginatedQueryOptions<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // If syncWithUrl is true, prioritize URL params for initial state
  const urlPage = syncWithUrl ? parseInt(searchParams.get("page") || "0", 10) : 0;
  const urlPageSize = syncWithUrl ? parseInt(searchParams.get("take") || "0", 10) : 0;

  const [page, setPageState] = useState(urlPage > 0 ? urlPage : initialPage);
  const [pageSize, setPageSizeState] = useState(urlPageSize > 0 ? urlPageSize : initialPageSize);

  const [data, setData] = useState<T[]>(initialData || []);
  const [meta, setMeta] = useState(
    initialMeta || {
      page,
      pageSize,
      totalCount: initialData ? initialData.length : 0,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    }
  );

  const [isLoading, setIsLoading] = useState(!initialData && enabled);
  const [error, setError] = useState<string | null>(null);
  
  const hasFetchedRef = useRef(false);
  const isFirstMountRef = useRef(true);

  // Keep track of mounted state to avoid setting state after unmount.
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

      const paramsObj = JSON.parse(serializedParams) as Record<string, string>;
      Object.entries(paramsObj).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });

      const res = await apiGet<PaginatedEnvelope<T>>(url.pathname + url.search);

      if (!isMountedRef.current) return;

      hasFetchedRef.current = true;
      if (res.error) {
        setError(res.error.message);
      } else if (res.data) {
        setData(res.data as unknown as T[]);
        const resMeta = (res as any).meta;
        if (resMeta) {
          setMeta((prev: any) => ({ ...prev, ...resMeta }));
        }
      }
    } catch (err: any) {
      if (isMountedRef.current) setError(err.message || "Failed to fetch data");
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [baseUrl, serializedParams]);

  useEffect(() => {
    if (!enabled) return;
    // Skip duplicate initial fetch if initialData was provided and params haven't changed
    if (isFirstMountRef.current && initialData && initialData.length > 0) {
      isFirstMountRef.current = false;
      return;
    }
    isFirstMountRef.current = false;
    fetchPage(page, pageSize);
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
    setPageState(1);
    
    if (syncWithUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", "1");
      params.set("take", newTake.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  // Helper to pre-fill initial data when passed from server component
  const setInitialData = (newInitialData: T[], newInitialMeta: any) => {
    if (!hasFetchedRef.current) {
      setData(newInitialData);
      if (newInitialMeta) {
        setMeta(newInitialMeta);
      }
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
