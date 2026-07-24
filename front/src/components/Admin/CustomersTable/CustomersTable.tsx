"use client";

import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CustomerData } from "./CustomersColumn";
import { Toaster } from "@/components/ui/toaster";
import CustomersMoreInfo from "./CustomersMoreInfo";

interface DataTableProps {
  columns: unknown[];
  data: CustomerData[];
}

function CustomerRow({ customer }: { customer: CustomerData }) {
  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
      {/* Desktop View */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-3 items-center text-sm">
        <div className="col-span-2 truncate">
          <div className="font-medium text-gray-900 dark:text-white truncate">{customer.name}</div>
          <div className="text-gray-500 dark:text-gray-400 text-xs truncate">{customer.email}</div>
        </div>
        <div className="col-span-1 text-gray-700 dark:text-gray-300">{customer.number}</div>
        <div className="col-span-1 text-gray-700 dark:text-gray-300 truncate">{customer.telegram}</div>
        <div className="col-span-1 text-gray-700 dark:text-gray-300">{customer.gender}</div>
        <div className="col-span-1 text-gray-700 dark:text-gray-300">{customer.dob}</div>
        <div className="col-span-1 text-gray-700 dark:text-gray-300">{customer.pannumber}</div>
        <div className="col-span-1 text-center text-gray-700 dark:text-gray-300">{customer.following}</div>
        <div className="col-span-1 text-center text-gray-700 dark:text-gray-300">{customer.servicesAvailed}</div>
        <div className="col-span-1 text-center text-gray-700 dark:text-gray-300">{customer.orders}</div>
        <div className="col-span-1 text-gray-500 dark:text-gray-400">{customer.createdAt}</div>
        <div className="col-span-1 flex justify-center">
          <CustomersMoreInfo _id={customer._id} />
        </div>
      </div>

      {/* Mobile/Tablet View */}
      <div className="lg:hidden px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-gray-900 dark:text-white truncate">{customer.name}</div>
            <div className="text-gray-500 dark:text-gray-400 text-sm truncate">{customer.email}</div>
          </div>
          <CustomersMoreInfo _id={customer._id} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Phone: </span>
            <span className="text-gray-700 dark:text-gray-300">{customer.number}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Telegram: </span>
            <span className="text-gray-700 dark:text-gray-300">{customer.telegram}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Gender: </span>
            <span className="text-gray-700 dark:text-gray-300">{customer.gender}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">DOB: </span>
            <span className="text-gray-700 dark:text-gray-300">{customer.dob}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">PAN: </span>
            <span className="text-gray-700 dark:text-gray-300">{customer.pannumber}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Following: </span>
            <span className="text-gray-700 dark:text-gray-300">{customer.following}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Services: </span>
            <span className="text-gray-700 dark:text-gray-300">{customer.servicesAvailed}</span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Orders: </span>
            <span className="text-gray-700 dark:text-gray-300">{customer.orders}</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Joined: {customer.createdAt}
        </div>
      </div>
    </div>
  );
}

export function CustomersTable({ data }: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredData = data.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(customer.number).includes(searchTerm)
  );

  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `TradeBox Userdata ${day}-${month}-${year}.xlsx`);
  };

  return (
    <div>
      <Toaster />

      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green focus:border-transparent outline-none transition-all"
          />
        </div>
        <Button onClick={exportToExcel} className="whitespace-nowrap">
          Export to Excel
        </Button>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Showing {filteredData.length} of {data.length} users
      </div>

      {/* List Container */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header - Desktop Only */}
        <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-3 bg-gray-100 dark:bg-gray-900 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
          <div className="col-span-2">User</div>
          <div className="col-span-1">Phone</div>
          <div className="col-span-1">Telegram</div>
          <div className="col-span-1">Gender</div>
          <div className="col-span-1">DOB</div>
          <div className="col-span-1">PAN</div>
          <div className="col-span-1 text-center">Following</div>
          <div className="col-span-1 text-center">Services</div>
          <div className="col-span-1 text-center">Orders</div>
          <div className="col-span-1">Joined</div>
          <div className="col-span-1 text-center">Actions</div>
        </div>

        {/* List Items */}
        {filteredData.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredData.map((customer) => (
              <CustomerRow key={customer._id} customer={customer} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}
