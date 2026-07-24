import useSWR from "swr";
import fetcher from "../setup";
import { eventType } from "../../types";

export function useDataEvents() {
  const { data, error, isLoading } = useSWR<{ data: eventType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allevents`,
    fetcher
  );

  return {
    events: data?.data,
    isLoading,
    isError: error,
  };
}



export function useDataEventsApproved() {
  const { data, error, isLoading } = useSWR<{ data: eventType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allapprovedevents`,
    fetcher
  );

  const approvedEvents = data?.data.filter(event => event?.approvalStatus === true);

  return {
    events: approvedEvents,
    isLoading,
    isError: error,
  };
}