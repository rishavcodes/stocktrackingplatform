"use client";

import { useSession } from "next-auth/react";
import RouteToPage from "@/app/RouteToPage";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

export default function Page() {
  const session = useSession();
  // Default lands on the "Create New Plan" form, but a view-only admin sub
  // profile can't create plans — send them to the read-only plan list instead.
  const url = isReadOnlySubProfile(session?.data)
    ? "/dashboard/serviceprovider/services/myplans"
    : "/dashboard/serviceprovider/services/createplan/";

  return <RouteToPage url={url} />;
}
