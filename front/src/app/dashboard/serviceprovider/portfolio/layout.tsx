import { ServiceProviderTabs } from "@/components";

const tabData = [
  {
    title: "Create New Portfolio",
        href: "/dashboard/serviceprovider/portfolio/create",
  },
  {
    title: "My Portfolios",
      href: "/dashboard/serviceprovider/portfolio/myportfolios",
  },
];

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <ServiceProviderTabs tabData={tabData} marginTop="mt-5" />
      <div>
        {children}
      </div>
    </div>
  );
}
