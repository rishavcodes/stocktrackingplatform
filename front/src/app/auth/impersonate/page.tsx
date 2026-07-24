"use client";

// Bridge page that exchanges an admin-issued impersonation JWT (passed in
// the `?token=` query param) for a NextAuth session, then forwards the
// admin into the target dashboard. Mounted at `/auth/impersonate` and only
// reached by clicking a "View as ..." button on the admin pages —
// there's no direct user-facing entry.
//
// `?dest=` is an allow-listed destination path (defaults to the SP
// dashboard for backwards compatibility). We allow-list to prevent the
// bridge becoming an open-redirect once exposed.

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const ALLOWED_DESTINATIONS = new Set([
  "/dashboard/serviceprovider",
  "/dashboard/user",
  "/dashboard/broker",
]);

export default function ImpersonateBridge() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const rawDest = search.get("dest");
  const dest =
    rawDest && ALLOWED_DESTINATIONS.has(rawDest)
      ? rawDest
      : "/dashboard/serviceprovider";

  useEffect(() => {
    const token = search.get("token");
    if (!token) {
      setError("Missing impersonation token");
      return;
    }

    // `redirect: false` so we can route ourselves after the session is
    // established — NextAuth's default redirect ignores our intended
    // destination.
    signIn("credentials", {
      impersonateToken: token,
      redirect: false,
    })
      .then((result) => {
        if (result?.error) {
          setError(result.error);
          return;
        }
        router.replace(dest);
      })
      .catch((e) => {
        setError(e?.message ?? "Failed to start impersonation");
      });
  }, [router, search, dest]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3 text-center px-6">
        {error ? (
          <>
            <p className="text-sm font-medium text-red-600">
              Impersonation failed
            </p>
            <p className="text-xs text-gray-500 max-w-md">{error}</p>
            <button
              onClick={() => router.back()}
              className="mt-3 text-xs font-medium text-emerald-700 hover:underline"
            >
              Go back
            </button>
          </>
        ) : (
          <>
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">
              Opening{" "}
              {dest === "/dashboard/user"
                ? "customer"
                : dest === "/dashboard/broker"
                ? "broker"
                : "service provider"}{" "}
              dashboard…
            </p>
          </>
        )}
      </div>
    </div>
  );
}
