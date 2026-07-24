"use client";

import { useEffect, useState } from "react";
import { parseSubdomain, type ResolvedSp } from "@/lib/customDomain";

const cache = new Map<string, ResolvedSp | null>();

/**
 * Resolves the SP that owns the subdomain the user is currently on.
 * Returns `undefined` while loading, `null` on apex or unknown subdomain.
 */
export function useCurrentSubdomainSp(): ResolvedSp | null | undefined {
  const [sp, setSp] = useState<ResolvedSp | null | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const sub = parseSubdomain(window.location.hostname);
    if (!sub) return null;
    return cache.has(sub) ? cache.get(sub) : undefined;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sub = parseSubdomain(window.location.hostname);
    if (!sub) {
      setSp(null);
      return;
    }
    if (cache.has(sub)) {
      setSp(cache.get(sub));
      return;
    }
    let cancelled = false;
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/sp-by-subdomain/${encodeURIComponent(sub)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const value: ResolvedSp | null = j?.success && j.data ? j.data : null;
        cache.set(sub, value);
        if (!cancelled) setSp(value);
      })
      .catch(() => {
        if (!cancelled) {
          cache.set(sub, null);
          setSp(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return sp;
}
