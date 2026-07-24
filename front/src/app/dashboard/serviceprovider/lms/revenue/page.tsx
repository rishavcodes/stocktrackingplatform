import RevenueSummary from "./RevenueSummary";
import RevenueByCourseTable from "./RevenueByCourseTable";
import RevenueOrdersTable from "./RevenueOrdersTable";
import ExportRevenueToExcel from "./ExportRevenueToExcel";
import { Toaster } from "@/components/ui/toaster";

export default function RevenuePage() {
    return (
        <div className="p-6 space-y-6">
            <Toaster />
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Revenue</h1>
                <ExportRevenueToExcel />
            </div>
            <RevenueSummary />
            <RevenueByCourseTable />
            <RevenueOrdersTable />
        </div>
    );
}
