"use client";

import { useSession } from "next-auth/react";
import RouteToPage from "@/app/RouteToPage";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

export default function Page() {
  const session = useSession();
  // The recommendations section defaults to the "Create" form, but a view-only
  // admin sub profile can't post — send them to the read-only list instead.
  const url = isReadOnlySubProfile(session?.data)
    ? "/dashboard/serviceprovider/recommendations/myrecommendations"
    : "/dashboard/serviceprovider/recommendations/create";

  return <RouteToPage url={url} />;
}
