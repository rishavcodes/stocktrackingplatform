import { ServiceProviderTabs } from "@/components";
import React from "react";

const tabData = [
  {
    title: "Recommendations",
    href: "/dashboard/serviceprovider/subscribedservices/recommendations",
  },
  {
    title: "Services",
    href: "/dashboard/serviceprovider/subscribedservices/services",
  },
];

export default function SuperUserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-whiteShade h-auto overflow-hidden dark:bg-blackShade">
      <div className="ss:text-[40px] text-[30px] ss:w-full w-[90%] mx-auto mt-10">
        Subscribed Services
      </div>
      <ServiceProviderTabs tabData={tabData} />
      <div className="w-full">{children}</div>
    </div>
  );
}
