import useSWR from "swr";
import fetcher from "../setup";
import { OurServicesType } from "../../types";

export function useDataServices() {
  const { data, error, isLoading } = useSWR<{ data: OurServicesType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allservices?segment=${"All"}`,
    fetcher
  );

  return {
    services: data?.data,
    isLoading,
    isError: error,
  };
}