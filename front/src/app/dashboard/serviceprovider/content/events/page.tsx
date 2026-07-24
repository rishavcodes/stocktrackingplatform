"use client";

import { useSession } from "next-auth/react";
import RouteToPage from "../../../../RouteToPage";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

export default function Event() {
  const session = useSession();
  // Default lands on the "Post New Event" form, but a view-only admin sub
  // profile can't post — send them to the read-only upcoming list instead.
  const url = isReadOnlySubProfile(session?.data)
    ? "/dashboard/serviceprovider/content/events/upcomingevents"
    : "/dashboard/serviceprovider/content/events/postevent";

  return (
    <>
      <RouteToPage url={url} />
    </>
  );
}
