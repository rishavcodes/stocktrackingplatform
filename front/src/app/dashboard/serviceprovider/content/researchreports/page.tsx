"use client";

import { useSession } from "next-auth/react";
import RouteToPage from "../../../../RouteToPage";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

export default function ResearchReport() {
  const session = useSession();
  // Default lands on the "Post New Research Report" form, but a view-only admin
  // sub profile can't post — send them to the read-only list instead.
  const url = isReadOnlySubProfile(session?.data)
    ? "/dashboard/serviceprovider/content/researchreports/postedresearchreports"
    : "/dashboard/serviceprovider/content/researchreports/postresearchreport";

  return (
    <>
      <RouteToPage url={url} />
    </>
  );
}
