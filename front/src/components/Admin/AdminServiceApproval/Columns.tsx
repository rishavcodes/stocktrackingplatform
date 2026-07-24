import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { OurServicesType } from "@/lib/types";

// export type OurServicesType = {
//   type: string;
//   title: string;
//   category: string[];
//   approvalStatus: boolean;
// };

export const columns: ColumnDef<OurServicesType>[] = [
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
    accessorKey: "segment",
    header: "Segment",
  },
  {
    accessorKey: "authorData.name",
    header: "Author",
  },
];
