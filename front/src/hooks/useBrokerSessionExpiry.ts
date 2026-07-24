"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  BIGUL_SESSION_KEY,
  getBrokerSession,
  redirectToBigulSSO,
} from "@/lib/brokerSession";

/**
 * When on a Bigul marketplace, checks broker session (session.brokerSession and localStorage)
 * for expiry. If expired, clears storage and session.brokerSession then redirects to Bigul SSO.
 * Call this from marketplace [slug] page and recommendations page when isBigulMarketplace is true.
 */
export function useBrokerSessionExpiry(isBigulMarketplace: boolean): void {
  const { data: session, status, update } = useSession();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !isBigulMarketplace) return;
    if (hasRedirectedRef.current) return;
    if (status === "loading") return;

    const broker = getBrokerSession(session);
    const now = Date.now();

    // Check session.brokerSession expiry
    const fromSession = session?.brokerSession;
    if (
      fromSession?.expiresAt != null &&
      now > fromSession.expiresAt
    ) {
      hasRedirectedRef.current = true;
      update({ brokerSession: null }).then(() => {
        localStorage.removeItem(BIGUL_SESSION_KEY);
        redirectToBigulSSO();
      });
      return;
    }

    // Check localStorage (Bigul) expiry
    try {
      const raw = localStorage.getItem(BIGUL_SESSION_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { expiresAt?: number };
        if (data?.expiresAt != null && now > data.expiresAt) {
          hasRedirectedRef.current = true;
          localStorage.removeItem(BIGUL_SESSION_KEY);
          redirectToBigulSSO();
        }
      }
    } catch {
      // ignore
    }
  }, [isBigulMarketplace, session, status, update]);
}
