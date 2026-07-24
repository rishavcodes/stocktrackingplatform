"use client";

import { columns } from "./Columns";
import { DataTable } from "./data-tableapproved";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useDataServices } from "@/lib/data/Home/ServiceDataHome";

export default function ServiceApprovedTable() {
  const session = useSession();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.data?.backendToken}`,
  };

//   const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allevent`
  const {services} = useDataServices();
  
//   console.log("this is the data: ", services)

  const filteredApprovedServices = services?.filter(service => service?.approvalStatus === true) || [];

  console.log("Filtered events: ", filteredApprovedServices);

//   if (isLoading) {
//     return (
//       <DataTable
//         columns={columns}
//         data={data?.events || []}
//         isLoading={isLoading}
//       />
//     );
//   }

  return <DataTable columns={columns} data={filteredApprovedServices || []} />;
}
