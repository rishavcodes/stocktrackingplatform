"use client";

import { useSession } from "next-auth/react";
import { ServiceProviderTabs } from "@/components";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

const tabData = [
  {
    title: "Post New Research Report",
    href: "/dashboard/serviceprovider/content/researchreports/postresearchreport",
  },
  {
    title: "Posted Research Reports",
    href: "/dashboard/serviceprovider/content/researchreports/postedresearchreports",
  },
  // {
  //   title: "Scheduled Research Reports",
  //   href: "/dashboard/serviceprovider/content/researchreports/scheduledresearchreports",
  // },
  
];

// Tabs that create/broadcast content — hidden for view-only admin sub profiles,
// who can read posted reports but can't post a new one or send a broadcast.
const WRITE_TAB_HREFS = [
  "/dashboard/serviceprovider/content/researchreports/postresearchreport",
  "/dashboard/serviceprovider/content/researchreports/quickmessage",
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const readOnly = isReadOnlySubProfile(session?.data);
  const tabs = readOnly
    ? tabData.filter((t) => !WRITE_TAB_HREFS.includes(t.href))
    : tabData;

  return (
    <>
      <ServiceProviderTabs tabData={tabs} marginTop="mt-0" />
      <div>{children}</div>
    </>
  );
}
