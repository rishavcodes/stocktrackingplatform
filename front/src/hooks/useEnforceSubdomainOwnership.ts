"use client";

import { useEffect } from "react";
import { APEX_DOMAIN, parseSubdomain } from "@/lib/customDomain";

/**
 * Cross-SP guard for /view/* product pages.
 *
 * If the current host is an SP subdomain (e.g. acme.tradeboxlive.com) but
 * the loaded product belongs to a different SP, redirect to the apex copy
 * so the page never renders under the wrong brand.
 *
 * Pass `null`/`undefined` while the product is still loading — the hook
 * is a no-op until both the host and the author id are known.
 */
export function useEnforceSubdomainOwnership(
  authorSpId: string | null | undefined
): void {
  useEffect(() => {
    if (!authorSpId || typeof window === "undefined") return;
    const sub = parseSubdomain(window.location.hostname);
    if (!sub) return;

    let cancelled = false;
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/sp-by-subdomain/${encodeURIComponent(sub)}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled) return;
        const subSpId: string | undefined = j?.data?._id;
        if (subSpId && subSpId !== authorSpId) {
          window.location.replace(
            `https://${APEX_DOMAIN}${window.location.pathname}${window.location.search}`
          );
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [authorSpId]);
}
