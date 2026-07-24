"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { BrokerSessionPayload } from "@/lib/types";
import { BIGUL_SESSION_KEY, BROKER_SESSION_TTL_MS } from "@/lib/brokerSession";

/** `state` value sent when the Bigul connect flow is started from the dashboard. */
export const DASHBOARD_BROKER_STATE = "dashboard-broker";
const DASHBOARD_BROKER_PATH = "/dashboard/user/broker";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface UseBigulSsoCallbackOptions {
  /** NextAuth session status. The callback is only processed once this resolves. */
  status: SessionStatus;
  /** NextAuth `update` from useSession(); merges the broker session for already-signed-in users. */
  updateSession: (data: { brokerSession: BrokerSessionPayload }) => Promise<unknown>;
  /** Called when SSO succeeds but no Tradebox account is linked yet (first-time signup). */
  onFirstTimeUser?: () => void;
}

/**
 * Handles the Bigul SSO redirect callback. Bigul allows only one hardcoded redirect
 * URL per app (the marketplace page), and echoes our query params back to it:
 * `status`, `access_token`, `client_code`, and the `state` we sent.
 *
 * - Persists the freshly-issued Bigul token to localStorage so hasBigulSession()
 *   succeeds regardless of Tradebox auth state (also avoids an SSO loop).
 * - Signs the user in (first-time) or merges the broker session into NextAuth
 *   (already authenticated).
 * - When `state === "dashboard-broker"`, links the broker to the user and routes
 *   them back to the dashboard broker section, since the connect flow was started
 *   there but Bigul can only redirect to the one hardcoded marketplace URL.
 */
export function useBigulSsoCallback({
  status,
  updateSession,
  onFirstTimeUser,
}: UseBigulSsoCallbackOptions): void {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Wait until the session status is known so we pick the correct branch
    // (signup vs merge) instead of racing the initial "loading" state.
    if (status === "loading") return;
    if (handledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("status") !== "success") return;
    const accessToken = params.get("access_token");
    if (!accessToken) return;

    handledRef.current = true;

    const clientCode = params.get("client_code") || "";
    const state = params.get("state");
    const expiresAt = Date.now() + BROKER_SESSION_TTL_MS;
    const isDashboard = state === DASHBOARD_BROKER_STATE;

    // Strip the callback params (token, etc.) from the URL and clear the stashed
    // return URL. Stripping also prevents this effect from re-processing.
    window.history.replaceState({}, "", window.location.pathname);
    sessionStorage.removeItem("bigulReturnUrl");

    // Always persist the token so the next hasBigulSession() check succeeds even
    // before NextAuth refreshes (belt-and-suspenders + loop avoidance).
    localStorage.setItem(
      BIGUL_SESSION_KEY,
      JSON.stringify({ accessToken, clientCode, expiresAt })
    );

    const goToDashboard = () => {
      if (isDashboard) router.push(DASHBOARD_BROKER_PATH);
    };

    if (status !== "authenticated") {
      signIn("credentials", {
        brokerType: "bigul",
        clientCode,
        loginAs: "user",
        accessToken,
        expiresAt: String(expiresAt),
        redirect: false,
      }).then((result) => {
        if (result?.ok === true) {
          // Returning linked user: broker session is now in NextAuth.
          goToDashboard();
        } else {
          // No linked Tradebox account: localStorage already populated above.
          onFirstTimeUser?.();
        }
      });
      return;
    }

    // Already signed in (email/Google/etc.): merge the broker session into NextAuth.
    updateSession({
      brokerSession: { brokerType: "bigul", clientCode, accessToken, expiresAt },
    }).then(async () => {
      if (isDashboard) {
        await linkBigulBroker(clientCode);
        goToDashboard();
      }
    });
  }, [status, updateSession, onFirstTimeUser, router]);
}

/**
 * Best-effort: record the Bigul linkage on the user (user.linkedBrokers) so the
 * dashboard shows the broker as connected across sessions. Mirrors the linking
 * MarketplaceAuthModal does for first-time signups.
 */
async function linkBigulBroker(clientCode: string): Promise<void> {
  try {
    const sessionRes = await fetch("/api/auth/session");
    const sessionData = await sessionRes.json();
    const token = sessionData?.backendToken;
    if (!token) return;
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/link-broker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ brokerType: "bigul", clientCode }),
    });
  } catch {
    // linking is best-effort; the broker session works without it
  }
}
