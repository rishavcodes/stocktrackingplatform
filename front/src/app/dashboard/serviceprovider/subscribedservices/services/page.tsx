"use client";

import { ServiceCard } from "@/components";
import fetcher from "@/lib/data/setup";
import { OurServicesType } from "@/lib/types";
import { useSession } from "next-auth/react";
import useSWR from "swr";

export default function Services() {
  const session = useSession();

  const { data } = useSWR<{ data: OurServicesType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/services/subscribedservices?id=${session.data?.user._id}&role=${session.data?.user.role}`,
    fetcher
  );

  return (
    <div className="flex flex-col mt-10">
      <ServiceCard servicesArray={data?.data || []} />
    </div>
  );
}
