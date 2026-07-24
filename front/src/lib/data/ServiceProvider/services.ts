import useSWR from "swr";
import fetcher from "../setup";
import { OurServicesType } from "@/lib/types";

export function useGetServices(id: string) {
  const { data, error, isLoading } = useSWR<{ data: OurServicesType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allservices?id=${id}`,
    fetcher
  );

  return {
    services: data?.data,
    isLoading,
    isError: error,
  };
}
