import { ColumnDef } from "@tanstack/react-table";
import { SPTypes } from "./page";

export const SPcolumns: ColumnDef<SPTypes>[] = [
  {
    accessorKey: "RegName",
    header: "Name",
  },
  {
    accessorKey: "type",
    header: "type",
  },
  {
    accessorKey: "regNumber",
    header: "SEBI",
  },
  { accessorKey: "followers", header: "Followers" },
];
