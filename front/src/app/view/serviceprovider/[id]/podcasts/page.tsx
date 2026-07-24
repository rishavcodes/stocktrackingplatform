"use client";

import PodcastCard from "@/components/PodcastCard/PodcastCard";
import fetcher from "@/lib/data/setup";
import { podcastType } from "@/lib/types";
import useSWR from "swr";
import { useEffect, useState } from "react";

export default function SPPodcastpage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);
  const { data } = useSWR<{ data: podcastType }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allpodcasts/previous?id=${id}`,
    fetcher
  );

  return (
    <div className="flex flex-col gap-5 pt-5 w-[75%] mx-auto">
      {data?.data.map((podcast) => (
        <PodcastCard
          key={podcast._id}
          title={podcast.title}
          description={podcast.description}
          link={podcast.link}
          videoID={podcast.videoID}
          category={podcast.category}
          image={podcast.image}
          tags={podcast.category}
          date={
            podcast.schedule === "Invalid Date"
              ? new Date(podcast.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })
              : new Date(podcast.schedule).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })
          }
        />
      ))}
    </div>
  );
}
