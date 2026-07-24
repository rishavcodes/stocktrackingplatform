"use client";

import { useSession } from "next-auth/react";
import { ServiceProviderTabs } from "@/components";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

const tabData = [
  {
    title: "Create new recommendation",
    href: "/dashboard/serviceprovider/recommendations/create",
  },
  {
    title: "My recommendations",
    href: "/dashboard/serviceprovider/recommendations/myrecommendations",
  },
  {
    title: "Performance",
    href: "/dashboard/serviceprovider/recommendations/performance",
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  // View-only admin sub profiles can't post recommendations — drop the
  // "Create" tab so they only see the read surfaces. The backend rejects the
  // create call regardless; this just keeps the UI honest.
  const readOnly = isReadOnlySubProfile(session?.data);
  const tabs = readOnly
    ? tabData.filter((t) => !t.href.endsWith("/create"))
    : tabData;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <div className="px-6 pb-0">
        <ServiceProviderTabs tabData={tabs} marginTop="mt-0" />
      </div>
      <div className="p-6 pt-4">
        {children}
      </div>
    </div>
  );
}
