import { ColumnDef } from "@tanstack/react-table";
import { ScoreCardTypes } from "@/lib/types";
import { ArrowUpDown } from "lucide-react";
import { AggregatedData } from "./page";

export const SPRecommendationColumn: ColumnDef<AggregatedData>[] = [
  {
    accessorKey: "spname",
    header: "Service Provider",
  },
  {
    accessorKey: "totalRecommendations",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Total Recommendation</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "openRecommendations",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Open</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "totalClosed",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Closed</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "successRatio",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Success Ratio</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
    cell: ({ row }) => <span>{(row.original.successRatio || 0).toFixed(2)}</span>,
  },
  {
    accessorKey: "returnPercentage",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-2"
        >
          <div>Return %</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
    cell: ({ row }) => <span>{(row.original.returnPercentage || 0).toFixed(2)}</span>,
  },
];
