import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { servicesTableType } from "./PMSOverview";

export const columns: ColumnDef<servicesTableType>[] = [
  {
    accessorKey: "id",
    header: "Id",
  },
  {
    accessorKey: "profileImg",
    header: "profileImg",
  },
  {
    accessorKey: "authorName",
    header: "authorName",
  },
  {
    accessorKey: "title",
    header: "Investment Approach",
  },
  {
    accessorKey: "onemonth",
    header: ({ column }) => {
      return (
        <div
          className="flex items-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="mt-1">1M</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },

  {
    accessorKey: "sixmonths",
    header: ({ column }) => {
      return (
        <div
          className="flex items-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="mt-1">6M</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "oneyear",
    header: ({ column }) => {
      return (
        <div
          className="flex items-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="mt-1">1Y</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "threeyears",
    header: ({ column }) => {
      return (
        <div
          className="flex items-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="mt-1">3Y</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "fiveyears",
    header: ({ column }) => {
      return (
        <div
          className="flex items-center"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          <div className="mt-1">5Y</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
];
