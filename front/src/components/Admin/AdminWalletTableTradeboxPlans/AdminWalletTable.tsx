"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ApproveSubscription from "./ApproveSubscription";
import DownloadIon from "@/icons/DownloadIcon";
import * as XLSX from "xlsx";

export function AdminWalletTable(data: any) {

  const [filterType, setFilterType] = useState("date");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const filteredData = data.data.filter((plan: any) => {
    if (filterType === "date") {
      const planDate = new Date(plan.createdAt);
      const from = fromDate ? new Date(fromDate) : null;
      const to = toDate ? new Date(new Date(toDate).setHours(23, 59, 59, 999)) : null;
      return (!from || planDate >= from) && (!to || planDate <= to);
    }
    if (filterType === "provider") {
      return plan.orderdBy.name.toLowerCase().includes(providerFilter.toLowerCase());
    }
    if (filterType === "service") {
      return plan.serviceName.toLowerCase().includes(serviceFilter.toLowerCase());
    }
    if (filterType === "status") {
      return statusFilter === "active" ? !plan.isExpired : plan.isExpired;
    }
    return true;
  });

  const exportToExcel = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString().replace(/\//g, "-"); // Format: YYYY-MM-DD
    const timeStr = now.toLocaleTimeString().replace(/:/g, "-");
    const worksheetData = filteredData.map((plan: any) => ({
      "Service Provider": plan.orderdBy.name,
      "Provider ID": plan.providerId,
      "Service Name": plan.serviceName,
      "Validity (Days)": plan.duration,
      "Amount (Without GST)": plan.amount,
      "GST": plan.GST,
      "Total Amount": plan.total,
      "Purchase Date": new Date(plan.createdAt).toLocaleDateString(),
      "Status": plan.isExpired ? "Expired" : "Active",
      "Invoice Link": plan.invoiceLink || "No Invoice",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plans");

    XLSX.writeFile(workbook, `Tradebox_Plans_${dateStr}_${timeStr}.xlsx`);
  };



  // console.log("this is the sp data: ", data.data);
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
                <option value="service">Service Name</option>
                <option value="status">Plan Status</option>
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

            {filterType === "service" && (
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Name</label>
                <input
                  type="text"
                  placeholder="Enter service"
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                />
              </div>
            )}

            {filterType === "status" && (
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-md border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1]"
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
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
                  setServiceFilter("");
                  setStatusFilter("");
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



      <div data-name="plans-table" className="bg-white rounded-lg shadow overflow-hidden mb-10">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GST
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((plan: any, index: any) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{plan.orderdBy.name}</div>
                        <div className="text-sm text-gray-500">{plan.providerId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{plan.serviceName ? plan.serviceName : plan.plan}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{plan.amount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">₹{plan.GST}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">₹{plan.total}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{new Date(plan.createdAt).toLocaleString("en-IN").split(",")[0]}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plan.invoiceLink ? (
                      <a
                        href={plan.invoiceLink}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <DownloadIon className="mr-1" />
                      </a>
                    ) : (
                      <span className="text-gray-400">No Invoice</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
