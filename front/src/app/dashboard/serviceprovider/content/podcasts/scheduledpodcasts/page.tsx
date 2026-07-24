"use client";

import { Search } from "lucide-react";
import PodcastCard from "@/components/PodcastCard/PodcastCard";
import { podcastType } from "@/lib/types";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";

export default function ScheduledPodcasts() {
  const session = useSession();

  const { data } = useSWR<{ data: podcastType }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allpodcasts/scheduled?id=${session.data?.user._id}`,
    fetcher
  );

  return (
    <div className="w-[95%] flex flex-col gap-10 mx-auto h-screen pt-10">
      <div className="flex justify-between">
        <div className="bg-white dark:bg-black flex px-5 py-2 mr-[50px]">
          <input
            placeholder="Search"
            className="focus:outline-none dark:bg-black"
          />
          <Search className="cursor-pointer" />
        </div>
      </div>

      <div className="flex gap-5 flex-wrap justify-center items-start mb-10">
        {data?.data.map((podcast) => {
          return (
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
          );
        })}
      </div>
    </div>
  );
}
