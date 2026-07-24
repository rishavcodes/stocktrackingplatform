import BrokerTabs from "@/components/Auth/Broker/BrokerTabs/BrokerTabs";

const tabData = [
	{
		title: "Create New Marketplace",
		href: "/dashboard/broker/marketplace/create",
	},
	{
		title: "My Marketplaces",
		href: "/dashboard/broker/marketplace/my-marketplaces",
	},
];

export default function layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm">
			<div className="px-6 pt-6 pb-0">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
					<h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
						Marketplace Section
					</h1>
				</div>
				<BrokerTabs tabData={tabData} marginTop="mt-0" />
			</div>
			<div className="p-6 pt-4">{children}</div>
		</div>
	);
}
