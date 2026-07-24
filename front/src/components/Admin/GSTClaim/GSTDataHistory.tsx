"use client";

import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";
import useSWR from "swr";

type GSTTableProps = {
  _id: string;
  amountSP: number;
  amountTradebox: number;
  from: string;
  to: string;
  createdAt: Date;
};

export default function GSTDataHistory() {
  const session = useSession();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.data?.backendToken}`,
  };

  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/tradeboxwallet/gstdatatable`;

  const { data } = useSWR<{
    data: GSTTableProps[];
  }>(url, (url: string) => fetcher(url, { headers }));

  return (
    <div className="p-5 mt-5 bg-white dark:bg-black">
      <div>GST claim history</div>
      <table className="w-full mt-5">
        <thead className="text-left">
          <tr>
            <th className="px-4 py-2">Amount SP Plans</th>
            <th className="px-4 py-2">Amount Tradebox Plans</th>
            <th className="px-4 py-2">Claimed On</th>
            <th className="px-4 py-2">Start Date</th>
            <th className="px-4 py-2">End date</th>
          </tr>
        </thead>
        <tbody>
          {data?.data &&
            data?.data.map((item) => (
              <tr key={item._id}>
                <td className="border px-4 py-2">{item.amountSP}</td>
                <td className="border px-4 py-2">{item.amountTradebox}</td>
                <td className="border px-4 py-2">
                  {
                    new Date(item.createdAt)
                      .toLocaleString("en-IN")
                      .split(",")[0]
                  }
                </td>
                <td className="border px-4 py-2">
                  {new Date(item.from).toLocaleString("en-IN").split(",")[0]}
                </td>
                <td className="border px-4 py-2">
                  {new Date(item.to).toLocaleString("en-IN").split(",")[0]}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
