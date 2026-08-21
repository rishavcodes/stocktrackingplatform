"use client";

import { useSession } from "next-auth/react";
import RouteToPage from "@/app/RouteToPage";
import { can, isReadOnlySubProfile } from "@/lib/subProfilePermissions";

export default function Page() {
  const session = useSession();

  // A sub profile without the `recommendation` module has nothing to be
  // forwarded to. Middleware would bounce them straight back here, so render a
  // message instead of redirecting — otherwise the two ping-pong forever.
  if (!can(session?.data, "recommendation")) {
    return (
      <p className="p-6 text-sm text-gray-600 dark:text-gray-300">
        You don&apos;t have access to recommendations. Ask your account owner to
        enable this module.
      </p>
    );
  }

  // The recommendations section defaults to the "Create" form, but a view-only
  // admin sub profile can't post — send them to the read-only list instead.
  const url = isReadOnlySubProfile(session?.data)
    ? "/dashboard/serviceprovider/recommendations/myrecommendations"
    : "/dashboard/serviceprovider/recommendations/create";

  return <RouteToPage url={url} />;
}
