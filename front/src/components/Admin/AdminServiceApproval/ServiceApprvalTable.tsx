"use client";

import { columns } from "./Columns";
import { DataTable } from "./data-table";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useDataServices } from "@/lib/data/Home/ServiceDataHome";

export default function ServiceApprovalTable() {
//   const session = useSession();

//   const headers = {
//     "Content-Type": "application/json",
//     Authorization: `Bearer ${session.data?.user.backendToken}`,
//   };

  const {services} = useDataServices();

//   console.log("these are the services: ", services)
  
  const filteredServices = services?.filter(service => service?.approvalStatus === false) || [];

//   console.log("Filtered services: ", filteredServices);

//   if (isLoading) {
//     return (
//       <DataTable
//         columns={columns}
//         data={data?.events || []}
//         isLoading={isLoading}
//       />
//     );
//   }

  return <DataTable columns={columns} data={filteredServices} />;
}
