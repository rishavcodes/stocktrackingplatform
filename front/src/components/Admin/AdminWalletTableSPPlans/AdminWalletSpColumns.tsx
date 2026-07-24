"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export type AdminWalletSPColumnTypes = {
  _id: string;
  orderdBy?: { name: string; email: string };
  purchasedBy?: string;
  soldByName?: string;
  soldBy?: { name: string; email: string };
  serviceId?: { title: string };
  paymentId: string;
  orderId: string;
  paymentMethod: string;
  amount: number;
  amountWithoutGST: number;
  serviceName: string;
  validity: string;
  createdAt: string;
  invoiceLink: string;
};

export const AdminWalletSPColumns: ColumnDef<AdminWalletSPColumnTypes>[] = [
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
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <div>Purchased by</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "soldByName",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <div>Sold By</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "paymentId",
    header: "Payment Id",
  },
  // {
  //   accessorKey: "orderId",
  //   header: "Order Id",
  // },
  {
    accessorKey: "paymentMethod",
    header: "Payment Method",
  },
  {
    accessorKey: "amountWithoutGST",
    header: "Amount",
  },
  {
    accessorKey: "GST",
    header: "GST",
  },
  {
    accessorKey: "amount",
    header: "Amount with GST.",
  },
  {
    accessorKey: "serviceName",
    header: "Service Name",
  },

  {
    accessorKey: "createdAt",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <div>Purchased on</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },

  {
    accessorKey: "validity",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2 whitespace-nowrap"
        >
          <div>Valid Upto</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },

  {
    accessorKey: "invoiceLink",
    header: "Invoice",
  },
];
