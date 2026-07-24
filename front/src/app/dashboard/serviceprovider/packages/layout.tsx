// app/dashboard/serviceprovider/packages/layout.tsx
import { ServiceProviderTabs } from "@/components";

const tabData = [
    {
        title: "Create Package",
        href: "/dashboard/serviceprovider/packages/create",
    },
    {
        title: "My Packages",
        href: "/dashboard/serviceprovider/packages/mypackages",
    },
];

export default function layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
            <ServiceProviderTabs tabData={tabData} marginTop="mt-5" />

            <div>{children}</div>
        </div>
    );
}
