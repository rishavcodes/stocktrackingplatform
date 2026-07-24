import { ColumnDef } from "@tanstack/react-table";

type LeadTableNormalTypes = {
  name: string;
  email: string;
  serviceName: string;
  createdAt: string;
  validity: string;
};

export const LeadTableFundColumns: ColumnDef<LeadTableNormalTypes>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "number",
    header: "Phone No.",
  },
  {
    accessorKey: "planName",
    header: "Plan",
  },
  { accessorKey: "contactedTo", header: "Contacted To" },
  {
    accessorKey: "createdAt",
    header: "Contacted on",
  },
];
