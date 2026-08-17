"use client";

import { useEffect, useState } from "react";

export function usePaymentMetadata() {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/tenant/fleet/payments/metadata`);
        if (res.ok) {
          const body = await res.json();
          if (!cancelled) setMetadata(body.data || body);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMetadata();
    return () => {
      cancelled = true;
    };
  }, []);

  return { metadata, loading };
}
