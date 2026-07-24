"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { AlertTriangle } from "lucide-react";

// Banner rendered at the top of the SP/user dashboard when the current
// session is an admin-driven impersonation. Clicking "Exit Impersonation"
// hits the exit route, which restores the admin's stashed session cookie
// (if any) and clears the impersonated cookie. We then redirect to the
// admin dashboard.
//
// Hidden when the session is a normal SP/user login.
export default function ImpersonationBanner() {
  const session = useSession();
  const [busy, setBusy] = useState(false);

  if (!session.data?.isImpersonation) return null;

  const exit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/impersonate/exit", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (json?.restored) {
        // Shadow cookie was found — admin session is back in place.
        // A full reload makes NextAuth re-read the cookie on the server.
        window.location.href = "/dashboard/admin";
      } else {
        // No shadow to restore — log out fully so we don't leave the user
        // stranded on an SP dashboard with no valid session.
        await signOut({ callbackUrl: "/auth/admin/signin" });
      }
    } catch {
      setBusy(false);
    }
  };

  const targetName =
    session.data?.user?.RegName ||
    session.data?.user?.name ||
    "this account";
  // `role` is 'provider' for SP impersonation, 'user' for customer.
  const roleLabel =
    session.data?.user?.role === "user" ? "customer" : "service provider";

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-amber-950 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <p className="text-xs sm:text-sm font-medium truncate">
            Viewing {roleLabel}{" "}
            <span className="font-semibold">{targetName}</span> as an admin.
          </p>
        </div>
        <button
          type="button"
          onClick={exit}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-950 disabled:opacity-60 text-white text-xs font-semibold flex-shrink-0 transition-colors"
        >
          {busy ? "Exiting…" : "Exit Impersonation"}
        </button>
      </div>
    </div>
  );
}
