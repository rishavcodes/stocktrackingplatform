"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export type AdminWalletColumnTypes = {
  _id: string;
  orderdBy?: { name: string; email: string };
  purchasedBy?: string;
  email?: string;
  serviceId?: { title: string };
  serviceName?: string;
  paymentId: string;
  orderId: string;
  paymentMethod: string;
  amount: number;
  planName: string;
  duration: number;
  createdAt: string;
  status: string;
};

export const AdminWalletColumns: ColumnDef<AdminWalletColumnTypes>[] = [
  {
    accessorKey: "_id",
    header: "id",
  },
  {
    accessorKey: "purchasedBy",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Purchased By</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "serviceName",
    header: "Service Name",
  },
  // {
  //   accessorKey: "amountWithoutGST",
  //   header: "Amount",
  // },
  // {
  //   accessorKey: "GST",
  //   header: "GST",
  // },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Amount (Total)</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "duration",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Validity</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Purchased on</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "invoiceLink",
    header: "Invoice",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
];
