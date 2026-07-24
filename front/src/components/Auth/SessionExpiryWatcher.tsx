"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Logs the user out the moment their session expires — regardless of which
 * page they're on or whether they navigate.
 *
 * Why this exists: the only expiry → redirect logic lives in middleware.ts,
 * and middleware runs ONLY on a real server request. Sitting idle, or doing
 * client-side <Link> navigations between cached pages, never hits the server,
 * so an expired session goes unnoticed until the user lands on a dynamic,
 * uncacheable page (e.g. Subscribers, which calls getServerSession). This
 * component closes that gap by watching the session's own `expires` timestamp
 * and firing signOut() exactly when it lapses.
 *
 * Mount it inside an authenticated area (a dashboard layout) — never on public
 * pages, where "unauthenticated" is a normal, expected state.
 */
export default function SessionExpiryWatcher({
  callbackUrl = "/",
}: {
  callbackUrl?: string;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 1) Active tab — schedule the logout to fire exactly at the expiry instant.
  useEffect(() => {
    if (status !== "authenticated" || !session?.expires) return;

    const expiresAt = new Date(session.expires).getTime();
    if (Number.isNaN(expiresAt)) return;

    const msLeft = expiresAt - Date.now();

    // Already expired (e.g. tab was asleep past expiry) — sign out now.
    if (msLeft <= 0) {
      signOut({ callbackUrl });
      return;
    }

    // setTimeout caps at ~24.8 days, comfortably above the 1-day session, so a
    // single timer is enough. Re-armed whenever `expires` changes (NextAuth
    // refreshes it on refetch), so a renewed session pushes the logout back.
    const timer = setTimeout(() => {
      signOut({ callbackUrl });
    }, msLeft);

    return () => clearTimeout(timer);
  }, [status, session?.expires, callbackUrl]);

  // 2) Safety net for a backgrounded tab whose timer was throttled/frozen:
  //    NextAuth refetches the session on window focus (default behaviour), and
  //    if the cookie has expired the status flips to "unauthenticated". Since
  //    this component only mounts inside the dashboard, that can only mean the
  //    session lapsed — bounce out immediately.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  return null;
}
