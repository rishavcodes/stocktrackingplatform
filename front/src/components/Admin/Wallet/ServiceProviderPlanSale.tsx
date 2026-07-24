"use client"
import DownloadIon from "@/icons/DownloadIcon"
import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";

export default function ServiceProviderPlanSale(data: any) {

    console.log(data)

    const [filterType, setFilterType] = useState("date");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [providerFilter, setProviderFilter] = useState("");
    const [serviceName, setServiceName] = useState("");

    const filteredData = data.data.filter((plan: any) => {
        if (filterType === "date") {
            const planDate = new Date(plan.createdAt);
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null;
            return (!from || planDate >= from) && (!to || planDate <= to);
        }
        if (filterType === "provider") {
            return plan.soldBy.name.toLowerCase().includes(providerFilter.toLowerCase());
        }
        if (filterType === "servicename") {
            return plan.serviceName.toLowerCase().includes(serviceName.toLowerCase());
        }
        return true;
    });

    const exportToExcel = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString().replace(/\//g, "-"); // Format: YYYY-MM-DD
        const timeStr = now.toLocaleTimeString().replace(/:/g, "-");
        const worksheedivata = filteredData.map((data: any) => ({
            "Purchased By": data.purchasedBy,
            "User Email": data.orderdBy?.email || "N/A",
            "Service Provider": data.soldByName,
            "Service Name": data.serviceName,
            "Payment Medivod": data.paymentMedivod || "N/A",
            "Amount (Excl. GST)": data.subtotal,
            "GST": data.gst || "N/A",
            "Total Amount": data.total ,
            "Purchase Date": data.createdAt,
            "Validity (Days)": data.validity,
            "KYC Done": data.kycDetails ? "Yes" : "No",
            "Aadhaar URL": data.kycDetails?.aadhaarUrl || "N/A",
            "PAN URL": data.kycDetails?.panUrl || "N/A",
            "Signed Doc URL": data.signedDocumentUrl || "N/A",
            "Invoice URL": data.invoiceLink || "N/A",
            "Payment Proof": data.paymentProof || "N/A",
            "Verified by RA": data.verifiedByRa ? "Yes" : "No",
        }));


        const worksheet = XLSX.utils.json_to_sheet(worksheedivata);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plans");

        XLSX.writeFile(workbook, `RA_Plans_Transaction_Data_${dateStr}_${timeStr}.xlsx`);
    };


    return (
        <>
            <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
                <div className="flex justify-between items-end">
                    <div className="flex flex-wrap gap-4">
                        <div className="w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Filter Type</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                            >
                                <option value="date">Date Range</option>
                                <option value="provider">Service Provider Name</option>
                                <option value="servicename">Plan Name</option>
                            </select>
                        </div>

                        {filterType === "date" && (
                            <div className="flex gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                                    />
                                </div>
                            </div>
                        )}

                        {filterType === "provider" && (
                            <div className="w-64">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Provider Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter name"
                                    value={providerFilter}
                                    onChange={(e) => setProviderFilter(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                                />
                            </div>
                        )}

                        {filterType === "servicename" && (
                            <div className="w-64">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter Service Name"
                                    value={serviceName}
                                    onChange={(e) => setServiceName(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                                />
                            </div>
                        )}

                        <div className="flex items-end space-x-2">
                            <button
                                onClick={() => { /* handle filter logic here */ }}
                                className="bg-[#3182ce] text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                            >
                                Apply Filter
                            </button>
                            <button
                                onClick={() => {
                                    setFilterType("date");
                                    setFromDate("");
                                    setToDate("");
                                    setProviderFilter("");
                                    setServiceName("");
                                }}
                                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Clear
                            </button>
                        </div>
                    </div>

                    <Button
                        onClick={exportToExcel}
                        className="bg-green-600 text-white"
                    >
                        Export to Excel
                    </Button>
                </div>
            </div>
            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-10">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {["Buyer", "Service Provider", "Service Name", "Amount", "GST", "Total", "Purchase Date", "Validity", "Invoice"].map((head) => (
                                    <th key={head} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{head}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.map((data: any, index: number) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 text-sm text-gray-900">{data.orderdBy?.name || "N/A"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{data.soldBy?.name || "N/A"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{data.serviceName || "N/A"}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">₹{data.subtotal || (data.amount ? (data.amount / 1.18).toFixed(2) : 0)}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">₹{data.gst || (data.amount ? (data.amount - data.amount / 1.18).toFixed(2) : 0)}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{data.total || data.amount || 0}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(data.createdAt).toLocaleString().split(",")[0]}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">{data.validity} Days</td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {data.invoiceLink ? (
                                            <a href={data.invoiceLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                <DownloadIon />
                                            </a>
                                        ) : <span className="text-gray-400 italic">NA</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}