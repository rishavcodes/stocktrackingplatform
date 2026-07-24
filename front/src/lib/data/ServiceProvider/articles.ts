import useSWR from "swr";
import fetcher from "../setup";
import { articleType } from "@/lib/types";

export function useGetArticles(id: string) {
  const { data, error, isLoading } = useSWR<{ data: articleType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allarticles?id=${id}`,
    fetcher
  );

  return {
    articles: data?.data,
    isLoading,
    isError: error,
  };
}

export function useGetPreviousArticles(id: string) {
  const { data, error, isLoading } = useSWR<{ data: articleType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allarticles/previous?id=${id}`,
    fetcher
  );

  return {
    articles: data?.data,
    isLoading,
    isError: error,
  };
}

export function useGetScheduledArticles(id: string) {
  const { data, error, isLoading } = useSWR<{ data: articleType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allarticles/scheduled?id=${id}`,
    fetcher
  );

  return {
    articles: data?.data,
    isLoading,
    isError: error,
  };
}
