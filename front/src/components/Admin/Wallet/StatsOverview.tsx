import CartIcon from "@/icons/CartIcon";
import ChartIcon from "@/icons/ChartIcon";
import ReceiptIcon from "@/icons/ReceiptIcon";
import UsersIcon from "@/icons/UsersIcon";
import WalletIcon from "@/icons/WalletIcon";

export default function StatsOverview(data: any) {

    const stats = data?.data ? data.data : null;

    return (
        <div data-name="wallet-stats" className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center">
                    <div className="p-3 rounded-full bg-[#ebf8ff]">
                        <WalletIcon />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Advance RA Wallet</p>
                        <h3 className="text-xl font-bold text-gray-900">₹{stats?.totalAdvanceAmount ?? 0}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center">
                    <div className="p-3 rounded-full bg-[#ebf8ff]">
                        <CartIcon />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Total Tradebox Sales</p>
                        <h3 className="text-xl font-bold text-gray-900">₹{stats?.totalAmountTradeboxPlans ?? 0}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-center">
                    <div className="p-3 rounded-full bg-[#f0fff4]">
                        <ReceiptIcon />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm text-gray-500">Total GST Collected</p>
                        <h3 className="text-xl font-bold text-gray-900">₹{stats?.totalGSTTradeboxPlans ?? 0}</h3>
                    </div>
                </div>
            </div>
        </div>
    )
}