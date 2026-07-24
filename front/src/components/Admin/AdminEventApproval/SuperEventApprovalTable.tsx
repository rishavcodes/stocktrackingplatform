"use client";

import { columns } from "./Columns";
import { DataTable } from "./data-table";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useDataEvents } from "@/lib/data/Home/EventDataHome";

export default function SuperEventApprovalTable() {
  const session = useSession();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.data?.backendToken}`,
  };

//   const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allevent`
  const {events} = useDataEvents();
  
  // console.log("this is the data: ", events)

  const filteredEvents = events?.filter(event => event?.approvalStatus === false) || [];

  // console.log("Filtered events: ", filteredEvents);

//   if (isLoading) {
//     return (
//       <DataTable
//         columns={columns}
//         data={data?.events || []}
//         isLoading={isLoading}
//       />
//     );
//   }

  return <DataTable columns={columns} data={filteredEvents || []} />;
}
