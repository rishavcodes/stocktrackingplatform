import { ServiceProviderTabs } from "@/components";

const tabData = [
  {
    title: "Subscription",
    href: "/dashboard/serviceprovider/membership/subscription",
  },
  {
    title: "Wallet",
    href: "/dashboard/serviceprovider/membership/wallet",
  },
];

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      
      {/* <ServiceProviderTabs tabData={tabData} marginTop="mt-5" /> */}
      {children}
    </div>
  );
}
