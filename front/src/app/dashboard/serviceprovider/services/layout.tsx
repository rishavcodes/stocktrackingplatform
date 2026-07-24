"use client";

import { useSession } from "next-auth/react";
import { ServiceProviderTabs } from "@/components";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

const tabData = [
  {
    title: "Create New Plan",
    href: "/dashboard/serviceprovider/services/createplan",
  },
  {
    title: "My Plans",
    href: "/dashboard/serviceprovider/services/myplans",
  },
  {
    title: "Analytics",
    href: "/dashboard/serviceprovider/services/analytics",
  },
];

// Tabs hidden from view-only admin sub profiles — they can browse the plan
// list (My Plans) but can't create a plan, and Analytics is hidden too.
const HIDDEN_FOR_READONLY = [
  "/dashboard/serviceprovider/services/createplan",
  "/dashboard/serviceprovider/services/analytics",
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const tabs = isReadOnlySubProfile(session?.data)
    ? tabData.filter((t) => !HIDDEN_FOR_READONLY.includes(t.href))
    : tabData;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">

      <ServiceProviderTabs tabData={tabs} marginTop="mt-5" />
      <div>
        {children}
      </div>
    </div>
  );
}
