"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export type withDrawalColumnType = {
  name: number;
  email: string;
  amount: number;
  spId: string;
  processedStatus: string;
};

export const withdrawalColumns: ColumnDef<withDrawalColumnType>[] = [
  {
    accessorKey: "_id",
    header: "Id",
  },
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Name</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Amount</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "spId",
    header: "spId",
  },
  {
    accessorKey: "processedStatus",
    header: "Status",
  },
  {
    accessorKey: "actions",
    header: "Actions",
  },
  {
    accessorKey: "accDetails",
    header: "Account Details",
  },
  {
    accessorKey: "wallet",
    header: "View Wallet",
  },
];
