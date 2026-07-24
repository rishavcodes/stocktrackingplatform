import { ColumnDef } from "@tanstack/react-table";

export type CustomerData = {
  _id: string;
  name: string;
  email: string;
  number: string | number;
  telegram: string;
  gender: string;
  dob: string;
  pannumber: string;
  following: number;
  servicesAvailed: number;
  orders: number;
  enrolledCourses: number;
  createdAt: string;
};

export const CustomersColumns: ColumnDef<CustomerData>[] = [
  {
    accessorKey: "_id",
    header: "ID",
    enableHiding: true,
  },
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
    header: "Phone",
  },
  {
    accessorKey: "telegram",
    header: "Telegram",
  },
  {
    accessorKey: "gender",
    header: "Gender",
  },
  {
    accessorKey: "dob",
    header: "DOB",
  },
  {
    accessorKey: "pannumber",
    header: "PAN",
  },
  {
    accessorKey: "following",
    header: "Following",
  },
  {
    accessorKey: "servicesAvailed",
    header: "Services",
  },
  {
    accessorKey: "orders",
    header: "Orders",
  },
  {
    accessorKey: "enrolledCourses",
    header: "Courses",
  },
  {
    accessorKey: "createdAt",
    header: "Joined On",
  },
  {
    id: "actions",
    header: "Actions",
  },
];
