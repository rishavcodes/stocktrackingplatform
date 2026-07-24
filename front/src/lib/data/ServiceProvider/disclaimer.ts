import useSWR from "swr";
import fetcher from "../setup";

export function useFetchDisclaimer(id: string) {
  const { data, error, isLoading } = useSWR<{ data: string }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/disclaimer?id=${id}`,
    fetcher
  );

  return {
    authorDisclaimer: data?.data,
    isLoading,
    isError: error,
  };
}
