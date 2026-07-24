"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";

type Transaction = {
  _id: string;
  amount: number;
  type: string;
  paymentId: string;
  orderId: string;
  orderdBy: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
};

type WalletBalanceType = {
  amount: number;
  transactions: Transaction[];
};

export default function BrokerWalletDetails() {
  const session = useSession();
  const { toast } = useToast();
  const [walletbalance, setWalletBalance] = useState<WalletBalanceType>({
    amount: 0,
    transactions: [],
  });

  const { data } = useSWR<{ data: WalletBalanceType }>(
    session.data?.user?.id
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payment/walletbalance?id=${session.data.user.id}`
      : null,
    fetcher
  );

  useEffect(() => {
    if (data?.data) {
      setWalletBalance(data.data);
    }
  }, [data?.data]);

  const exportToExcel = () => {
    if (!walletbalance?.transactions.length) {
      toast({
        title: "No Data",
        description: "No transactions available to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = walletbalance.transactions
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((transaction) => ({
        Type:
          transaction.type.charAt(0).toUpperCase() +
          transaction.type.slice(1),
        Name: transaction?.orderdBy?.name || "NA",
        Email: transaction?.orderdBy?.email || "NA",
        Date: new Date(transaction.createdAt).toLocaleString(),
        Amount: `₹${transaction.amount.toFixed(2)}`,
        "Payment ID": transaction.paymentId || "NA",
        "Order ID": transaction.orderId || "NA",
      }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 25 },
      { wch: 25 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");

    const fileName = `Broker_Wallet_Transactions_${new Date()
      .toLocaleDateString("en-IN")
      .replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Export Successful",
      description: `${walletbalance.transactions.length} transactions exported to Excel`,
    });
  };

  const isCredit = (type: string) =>
    type === "topup" || type === "marketplace-broker-commission";

  return (
    <div>
      <div className="dark:bg-gray-900 bg-white flex justify-between sm:flex-row flex-col rounded-2xl m-5 overflow-hidden shadow-lg dark:shadow-gray-800/50 shadow-gray-200">
        <div className="flex flex-col gap-6 p-8 sm:w-[60%]">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Broker Wallet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              Commission earnings from marketplace purchases
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 sm:rounded-l-[3rem] rounded-b-2xl sm:rounded-br-none text-white flex flex-col sm:w-[40%] w-full justify-center items-center py-8 px-4">
          <div className="flex flex-col items-center">
            <span className="md:text-5xl text-4xl font-bold mb-2 tracking-tight">
              ₹{walletbalance.amount.toFixed(2)}
            </span>
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="md:text-xl text-lg font-medium">
                Wallet Balance
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Transaction History</h2>
          <button
            onClick={exportToExcel}
            disabled={!walletbalance?.transactions.length}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export to Excel
          </button>
        </div>
        <div className="overflow-x-auto bg-white dark:bg-gray-900 p-4 rounded-lg shadow">
          {walletbalance?.transactions.length ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-left">
                  <th className="p-3">Type</th>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {walletbalance.transactions
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map((transaction) => (
                    <tr key={transaction._id} className="border-b">
                      <td className="p-3 font-semibold capitalize">
                        {transaction.type.replace(/-/g, " ")}
                      </td>
                      <td className="p-3 font-semibold">
                        {transaction?.orderdBy?.name || "NA"}
                      </td>
                      <td className="p-3 font-semibold">
                        {transaction?.orderdBy?.email || "NA"}
                      </td>
                      <td className="p-3 text-gray-500">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </td>
                      <td
                        className={`p-3 font-bold ${
                          isCredit(transaction.type)
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {isCredit(transaction.type) ? "+" : "-"}₹
                        {transaction.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-3">
              No transactions found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
