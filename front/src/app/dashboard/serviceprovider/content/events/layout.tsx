"use client";

import { useSession } from "next-auth/react";
import { ServiceProviderTabs } from "@/components";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

const tabData = [
  {
    title: "Post New Event",
    href: "/dashboard/serviceprovider/content/events/postevent",
  },
  {
    title: "Previous Events",
    href: "/dashboard/serviceprovider/content/events/previousevents",
  },
  {
    title: "Upcoming Events",
    href: "/dashboard/serviceprovider/content/events/upcomingevents",
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  // View-only admin sub profiles can browse events but can't post one — drop
  // the "Post New Event" tab. The backend rejects the create call regardless.
  const tabs = isReadOnlySubProfile(session?.data)
    ? tabData.filter((t) => !t.href.endsWith("/postevent"))
    : tabData;

  return (
    <>
      <ServiceProviderTabs tabData={tabs} marginTop="mt-0" />
      <div className="mt-5">{children}</div>
    </>
  );
}
