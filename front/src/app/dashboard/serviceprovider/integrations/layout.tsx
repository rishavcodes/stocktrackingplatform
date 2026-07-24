import { ServiceProviderTabs } from "@/components";

const tabData = [
  {
    title: "Razorpay",
    href: "/dashboard/serviceprovider/integrations/razorpay",
  },
];

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <div className="px-6 pt-6 pb-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Integration Section
          </h1>
        </div>
      </div>
      <ServiceProviderTabs tabData={tabData} marginTop="mt-5" />
      <div>
        {children}
      </div>
    </div>
  );
}
