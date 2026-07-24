import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { ScoreCardTypes } from "@/lib/types";

export const RecommendationColumns: ColumnDef<ScoreCardTypes>[] = [
  {
    accessorKey: "_id",
    header: "Category",
  },

  {
    accessorKey: "SharedBy",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          <div>Shared By</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },

  {
    accessorKey: "exchange",
    header: "Exchange",
  },
  {
    accessorKey: "scriptname",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          <div>Name</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "validity",
    header: "Validity",
  },
  {
    accessorKey: "entryType",
    header: "Buy/Sell",
  },
  {
    accessorKey: "entryPrice",
    header: "Entry Price",
  },
  {
    accessorKey: "exitRate",
    header: "Exit Rate",
  },
  {
    accessorKey: "rateRange",
    header: "Rate/Range",
  },
  { accessorKey: "ltp", header: "LTP" },
  {
    accessorKey: "target",
    header: "Target",
  },
  {
    accessorKey: "stoploss",
    header: "Stop Loss",
  },

  {
    accessorKey: "pnl",
    header: "P/L",
  },
  {
    accessorKey: "pnlpercentage",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          <div>(P/L)%</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "istriggered",
    header: "initiated/not initiated",
  },
  {
    accessorKey: "result",
    header: "Result",
  },
  {
    accessorKey: "holdingPeriod",
    header: ({ column }) => {
      return (
        <div
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1"
        >
          <div>Holding Period</div>
          <ArrowUpDown className="h-4 w-4 cursor-pointer" />
        </div>
      );
    },
  },
  {
    accessorKey: "moreinfo",
    header: "More Info",
  },

  {
    accessorKey: "createdAt",
    header: "Created At",
  },
  {
    accessorKey: "riskRewardRatio",
    header: "Risk Reward Ratio",
  },
  {
    accessorKey: "shareWith",
    header: "Shared With",
  },
  {
    accessorKey: "shareWithPlans",
    header: "Shared With Plans",
  },
];
