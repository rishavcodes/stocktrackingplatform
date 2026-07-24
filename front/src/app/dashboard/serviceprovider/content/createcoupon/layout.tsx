"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ServiceProviderTabs } from "@/components";
import { isReadOnlySubProfile } from "@/lib/subProfilePermissions";

const tabData = [
  {
    title: "Add New Coupon",
    href: "/dashboard/serviceprovider/content/createcoupon/addcoupon",
  },
  {
    title: "My Coupons",
    href: "/dashboard/serviceprovider/content/createcoupon/previouscoupons",
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const router = useRouter();

  // The coupon section is hidden from view-only admin sub profiles. Bounce them
  // to the dashboard overview if they reach any createcoupon route directly.
  const readOnly = isReadOnlySubProfile(session?.data);
  useEffect(() => {
    if (readOnly) {
      router.replace("/dashboard/serviceprovider/overview");
    }
  }, [readOnly, router]);
  if (readOnly) return null;

  return (
    <>
      <ServiceProviderTabs tabData={tabData} />
      <div className="mt-5">{children}</div>
    </>
  );
}
