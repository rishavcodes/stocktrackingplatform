import useSWR from "swr";
import fetcher from "../setup";

export function useFetchFollowing(id: string, role: string, flag: boolean) {
  const { data, error, isLoading } = useSWR<{ data: string[] }>(
    flag
      ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/getfollowing/list?id=${id}&role=${role}`
      : null,
    fetcher
  );

  return {
    following: data?.data,
    isLoading,
    isError: error,
  };
}
