"use client";
import { ServiceProviderTabs } from "@/components";

const tabData = [
  {
    title: "My Profile",
    href: "/dashboard/serviceprovider/myprofile/details",
  },
  {
    title: "Bank Details",
    href: "/dashboard/serviceprovider/myprofile/bankdetails",
  },
  {
    title: "Integration",
    href: "/dashboard/serviceprovider/myprofile/integrations",
  },
  {
    title: "KRA Integration",
    href: "/dashboard/serviceprovider/myprofile/kra-integration",
  },
  // {
  //   title: "Email Service",
  //   href: "/dashboard/serviceprovider/myprofile/email-setup",
  // },
];

export default function layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <div className="px-6 pt-6 pb-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
            Profile Details
          </h1>

          {/* <div className="mt-4 md:mt-0">
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm transition-colors duration-200 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit Profile
            </button>
          </div> */}
        </div>

        <ServiceProviderTabs tabData={tabData} marginTop="mt-0" />
      </div>

      <div className="p-6 pt-4">
        {children}
      </div>
    </div>
  );
}