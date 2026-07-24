"use client"
import DownloadIon from "@/icons/DownloadIcon"
import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";

export default function RAWalletTransactions(data: any) {

    // console.log("checking: ", data.data[0].providerName)

    const [filterType, setFilterType] = useState("date");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [providerFilter, setProviderFilter] = useState("");
    const [transactionType, setTransctionType] = useState("");
    const [paymentIdFilter, setPaymentIdFilter] = useState("active");

    const filteredData = data.data.filter((plan: any) => {
        if (filterType === "date") {
            const planDate = new Date(plan.createdAt);
            const from = fromDate ? new Date(fromDate) : null;
            const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null;
            return (!from || planDate >= from) && (!to || planDate <= to);
        }
        if (filterType === "provider") {
            return plan.providerName &&
                plan.providerName.toLowerCase().includes(providerFilter.toLowerCase())
        }
        if (filterType === "type") {
            return plan.type.toLowerCase().includes(transactionType.toLowerCase());
        }
        if (filterType === "paymentId") {
            return plan.paymentId.toLowerCase().includes(paymentIdFilter.toLowerCase());
        }
        return true;
    });

     const exportToExcel = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString().replace(/\//g, "-"); // Format: YYYY-MM-DD
        const timeStr = now.toLocaleTimeString().replace(/:/g, "-");
        const worksheetData = filteredData.map((data: any) => ({
            "Service Provider": data.providerName,
            "Provider ID": data.serviceProviderId,
            "Transaction Type": data.type,
            "Amount": data.amount.toFixed(2),
            "Payment ID": data.paymentId || "N/A",
            "Date": new Date(data.createdAt).toLocaleDateString(),
        }));
    
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plans");
    
        XLSX.writeFile(workbook, `RA_Wallet_Transaction_Data_${dateStr}_${timeStr}.xlsx`);
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
                                <option value="provider">Service Provider</option>
                                <option value="type">Transaction Type</option>
                                <option value="paymentId">Payment Id</option>
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

                        {filterType === "type" && (
                            <div className="w-64">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                                <input
                                    type="text"
                                    placeholder="Enter Transaction Type"
                                    value={transactionType}
                                    onChange={(e) => setTransctionType(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                                />
                            </div>
                        )}
                            
                        {filterType === "paymentId" && (
                            <div className="w-48">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Id</label>
                                <input
                                    type="text"
                                    placeholder="Enter PaymentId"
                                    value={paymentIdFilter}
                                    onChange={(e) => setPaymentIdFilter(e.target.value)}
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
                                    setTransctionType("");
                                    setPaymentIdFilter("");
                                }}
                                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                            >
                                Clear
                            </button>
                        </div>
                        <div>

                            <label className="  left block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                            <input
                                type="text"
                                value={`₹${filteredData.reduce((acc: number, curr: any) => acc + (curr.amount>0?curr.amount:0), 0).toFixed(2)}`}
                                readOnly
                                className="w-full rounded-md border border-gray-300 p-2 text-sm bg-gray-100 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                            />
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
            <div data-name="plans-table" className="bg-white rounded-lg shadow overflow-hidden mb-10">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Service Provider
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Transaction Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment Id
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Transaction Date
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.map((data: any, index: any) => (
                                <tr key={index}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{data.providerName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{data.type}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">₹{data.amount.toFixed(2)}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{data.paymentId}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{new Date(data.createdAt).toLocaleDateString()}</div>
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