import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

export type eventType = {
  type: string;
  title: string;
  category: string[];
  schedule: string;
  approvalStatus: boolean;
};

export const columns: ColumnDef<eventType>[] = [
  {
    accessorKey: "_id",
    header: "Id",
  },
  {
    accessorKey: "title",
    header: ({ column }) => {
      return (
        <Button
          variant="transparant"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Title
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
  },
  {
    accessorKey: "category",
    header: "Category",
  },
  {
    accessorKey: "schedule",
    header: "Date",
  },
  {
    accessorKey: "authorData.name",
    header: "Author",
  },
  {
    accessorKey: "registeredUsers.length",
    header: "No of Registrations",
  },
];
