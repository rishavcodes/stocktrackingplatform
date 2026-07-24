"use client";

import fetcher from "@/lib/data/setup";
import SectionHeading from "../Home/SectionHeading";
import useSWR from "swr";
import { OurServicesType } from "@/lib/types";
import { useEffect, useState } from "react";
import PMSTable from "./PMSTable";
import { columns } from "./Columns";

export type servicesTableType = {
  id: string;
  title: string;
  profileImg: string;
  authorName: string;
  onemonth: number | string;
  sixmonths: number | string;
  oneyear: number | string;
  threeyears: number | string;
  fiveyears: number | string;
};

export default function PMSOverview() {
  const { data, error, isLoading } = useSWR<{ data: OurServicesType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allpmsservices`,
    fetcher
  );

  const [servicesData, setServicesData] = useState<servicesTableType[]>([]);

  useEffect(() => {
    let dataTable: servicesTableType[] = [];

    data?.data.map((service) => {
      const dataToAdd: servicesTableType = {
        id: service._id,
        title: service.title,
        profileImg: service.authorData.authorImage,
        authorName: service.authorData.name,
        onemonth:
          service.returnsByTime?.[0] !== null &&
          service.returnsByTime?.[0] !== undefined
            ? service.returnsByTime?.[0] + "%"
            : "N/A",
        sixmonths:
          service.returnsByTime?.[1] !== null &&
          service.returnsByTime?.[1] !== undefined
            ? service.returnsByTime?.[1] + "%"
            : "N/A",
        oneyear:
          service.returnsByTime?.[2] !== null &&
          service.returnsByTime?.[2] !== undefined
            ? service.returnsByTime?.[2] + "%"
            : "N/A",
        threeyears:
          service.returnsByTime?.[3] !== null &&
          service.returnsByTime?.[3] !== undefined
            ? service.returnsByTime?.[3] + "%"
            : "N/A",
        fiveyears:
          service.returnsByTime?.[4] !== null &&
          service.returnsByTime?.[4] !== undefined
            ? service.returnsByTime?.[4] + "%"
            : "N/A",
      };

      dataTable.push(dataToAdd);
    });

    setServicesData(dataTable);
  }, [data?.data]);

  return (
    <div className="dark:bg-blackShade mt-24 mb-5 flex flex-col">
      <SectionHeading
        heading={{ text1: "PMS", text2: "Overview" }}
        description=""
      />

      <PMSTable data={servicesData} columns={columns} />
    </div>
  );
}
