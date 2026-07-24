"use client";

import { useEffect, useState } from "react";
import type { SpLike } from "@/lib/customDomain";

type SpSubdomainResponse = {
  success: boolean;
  data?: {
    _id: string;
    customSubdomain?: string | null;
    customSubdomainStatus?: "pending" | "active" | "disabled" | null;
  };
};

const cache = new Map<string, SpLike>();

/**
 * Fetch the subdomain bits (`customSubdomain`, `customSubdomainStatus`) for an
 * SP given its id. Used by view pages to build absolute share/PDF links that
 * point at the SP's branded subdomain when one is active.
 *
 * Returns `undefined` while loading and either an `SpLike` object or `null`
 * once resolved. Callers can pass the result straight into `buildProductUrl`.
 */
export function useSpSubdomain(spId: string | null | undefined): SpLike | undefined {
  const [sp, setSp] = useState<SpLike | undefined>(() =>
    spId && cache.has(spId) ? cache.get(spId) : undefined
  );

  useEffect(() => {
    if (!spId) {
      setSp(null);
      return;
    }
    if (cache.has(spId)) {
      setSp(cache.get(spId));
      return;
    }
    let cancelled = false;
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/sp-subdomain-by-id/${encodeURIComponent(spId)}`
    )
      .then((r) => (r.ok ? (r.json() as Promise<SpSubdomainResponse>) : null))
      .then((j) => {
        if (cancelled) return;
        const value: SpLike = j?.success && j.data ? j.data : null;
        cache.set(spId, value);
        setSp(value);
      })
      .catch(() => {
        if (cancelled) return;
        cache.set(spId, null);
        setSp(null);
      });
    return () => {
      cancelled = true;
    };
  }, [spId]);

  return sp;
}
