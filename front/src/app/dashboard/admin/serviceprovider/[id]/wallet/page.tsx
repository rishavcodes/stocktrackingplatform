"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type transactionsType = {
  _id: string;
  amount: number;
  type: string;
  paymentId: string;
  orderId: string;
  createdAt: string;
  orderdBy: {
    _id: string;
    name: string;
    email: string;
  };
};

export default function Wallet({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);

  const { data, isLoading, error } = useSWR<{
    data: { transactions: transactionsType[] };
  }>(
    id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/walletbalance?id=${id}`
      : null,
    fetcher
  );

  const transactions = data?.data?.transactions || [];

  // console.log("transactions", transactions)

  // Filter by user name
  const filteredTransactions = transactions.filter((txn) =>
    txn.orderdBy?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // console.log("filter transactions: ", filteredTransactions)

  const exportToExcel = () => {
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd_HH-mm");

  


    const exportData = transactions.map((txn) => {
  const isTopup = txn.type.toLowerCase().includes("topup");
  return {
    "User Name": txn.orderdBy?.name || "NA",
    Email: txn.orderdBy?.email || "NA",
    Type: isTopup ? "Topup" : "Debit",
    Amount: isTopup ? txn.amount : -txn.amount, 
    "Payment ID": txn.paymentId,
    "Order ID": txn.orderId || "N/A",
    Date: format(new Date(txn.createdAt), "dd MMM yyyy"),
    Time: format(new Date(txn.createdAt), "hh:mm a"),
  };
});


    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Wallet Transactions");

    XLSX.writeFile(workbook, `Wallet_Transactions_${dateStr}.xlsx`);
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

  if (error)
    return (
      <div className="p-6 bg-red-50 rounded-lg text-red-600 border border-red-200 max-w-2xl mx-auto">
        <div className="font-bold mb-1">Error Loading Transactions</div>
        <p>Please try again later or contact support</p>
      </div>
    );

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Header with Search and Export */}
        <div className="px-6 py-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Wallet Transactions</h2>
            <p className="text-gray-600 mt-1">
              {transactions.length} transaction{transactions.length !== 1 ? "s" : ""} found
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <Input
              type="text"
              placeholder="Search by user name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:w-64"
            />
            <Button onClick={exportToExcel} className="bg-green-600 text-white ">
              Export to Excel
            </Button>
          </div>
        </div>

        {/* Table */}
        {transactions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-2">No transactions recorded</div>
            <p className="text-gray-600 max-w-md mx-auto">
              All wallet transactions will appear here once available
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-gray-700 text-left">
                  <th className="px-6 py-3 font-semibold min-w-[220px]">User Details</th>
                  <th className="px-6 py-3 font-semibold min-w-[200px]">Transaction</th>
                  <th className="px-6 py-3 font-semibold min-w-[200px]">Amount</th>
                  <th className="px-6 py-3 font-semibold min-w-[180px]">Payment Info</th>
                  <th className="px-6 py-3 font-semibold min-w-[150px]">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {transactions.map((txn) => (
                  <tr key={txn._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{txn.orderdBy?.name || "NA"}</div>
                      <div className="text-gray-600 text-sm mt-1">{txn.orderdBy?.email || "NA"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${txn.type.includes("topup")
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                          }`}
                      >
                        {txn.type.replace(/-/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${txn.type.includes("topup")
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                          }`}
                      >
                        ₹{txn.amount.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 truncate max-w-[160px]">
                        <span className="font-medium">PID:</span> {txn.paymentId}
                        <br />
                        <span className="font-medium">Order:</span> {txn.orderId || "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {format(new Date(txn.createdAt), "dd MMM yyyy")}
                        <div className="text-xs text-gray-400">
                          {format(new Date(txn.createdAt), "hh:mm a")}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
