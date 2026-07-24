import { ColumnDef } from "@tanstack/react-table";

type LeadTableNormalTypes = {
  name: string;
  email: string;
  serviceName: string;
  createdAt: string;
  validity: string;
};

export const LeadTableNormalColumns: ColumnDef<LeadTableNormalTypes>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "serviceName",
    header: "Plan purchased",
  },
  {
    accessorKey: "createdAt",
    header: "Purchased on",
  },
  {
    accessorKey: "validity",
    header: "Expiring On",
  },
];
