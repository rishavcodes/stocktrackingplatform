import { ColumnDef } from "@tanstack/react-table";

type RegisteredUserColumnTypes = {
  _id: string;
  name: string;
  email: string;
};

export const RegisteredUserColumn: ColumnDef<RegisteredUserColumnTypes>[] = [
  {
    accessorKey: "_id",
    header: "id",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  }
];
