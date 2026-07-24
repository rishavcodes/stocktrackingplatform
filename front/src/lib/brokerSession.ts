import type { Session } from "next-auth";
import type { BrokerSessionPayload } from "@/lib/types";

export const BIGUL_SESSION_KEY = "bigulSession";
export const ALICE_BLUE_SESSION_KEY = "aliceBlueSession";

const BROKER_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Returns current valid broker session from NextAuth session first, then localStorage (Bigul).
 * Returns null if expired or missing.
 */
export function getBrokerSession(session: Session | null): BrokerSessionPayload | null {
  if (typeof window === "undefined") return null;

  const fromSession = session?.brokerSession;
  if (fromSession?.accessToken && fromSession?.clientCode && fromSession?.expiresAt != null) {
    if (Date.now() < fromSession.expiresAt) return fromSession;
  }

  try {
    const raw = localStorage.getItem(BIGUL_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { accessToken?: string; clientCode?: string; expiresAt?: number };
    if (!data?.accessToken || data?.expiresAt == null || Date.now() > data.expiresAt) return null;
    return {
      brokerType: "bigul",
      clientCode: data.clientCode ?? "",
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
    };
  } catch {
    return null;
  }
}

/**
 * Returns whether the user has a valid Bigul broker session (from session or localStorage).
 */
export function hasBigulSession(session: Session | null): boolean {
  return getBrokerSession(session) !== null;
}

/**
 * Returns client code for Bigul from session or localStorage; or Alice Blue clientId from localStorage.
 * For Bigul prefer session; for Alice Blue only localStorage is used.
 */
export function getBrokerClientCode(
  session: Session | null,
  isBigulMarketplace: boolean
): string {
  if (typeof window === "undefined") return "";
  if (isBigulMarketplace) {
    const broker = getBrokerSession(session);
    return broker?.clientCode ?? "";
  }
  try {
    const raw = localStorage.getItem(ALICE_BLUE_SESSION_KEY);
    const data = raw ? (JSON.parse(raw) as { clientId?: string }) : null;
    return data?.clientId ?? "";
  } catch {
    return "";
  }
}

/**
 * Redirects the browser to Bigul SSO with a fresh partner session.
 * Always calls session-login to avoid stale/expired vendor sessions on Bigul's side.
 *
 * @param state Optional value echoed back by Bigul on the callback. Bigul allows
 * only one hardcoded redirect URL per app, so we pass `state` to decide where to
 * route the user after they return (e.g. "dashboard-broker" to land on the
 * dashboard broker section). When omitted, the backend defaults to "tradebox"
 * and the marketplace callback keeps its in-place behavior.
 */
export async function redirectToBigulSSO(state?: string): Promise<void> {
  try {
    sessionStorage.setItem("bigulReturnUrl", window.location.href);
    sessionStorage.removeItem("bigulPartnerSessionId");

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/bigul/partner/session-login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state ? { state } : {}),
      }
    );
    const data = await res.json();
    if (data.success && data.data?.ssoUrl) {
      if (data.data.sessionId) {
        sessionStorage.setItem("bigulPartnerSessionId", data.data.sessionId);
      }
      window.location.href = data.data.ssoUrl;
    }
  } catch {
    // SSO redirect failed silently
  }
}

export { BROKER_SESSION_TTL_MS };
