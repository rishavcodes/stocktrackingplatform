"use client";

import { Search } from "lucide-react";

import VideoCard from "@/components/Cards/VideoCard/VideoCard";
import { videoType } from "@/lib/types";

import { useSession } from "next-auth/react";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";

export default function ScheduledVideos() {
  const session = useSession();

  const { data } = useSWR<{ data: videoType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allvideos/scheduled?id=${session.data?.user._id}`,
    fetcher
  );

  return (
    <div className="w-[95%] flex flex-col gap-10 mx-auto pt-10">
      <div className="flex justify-between">
        <div className="bg-white dark:bg-black flex px-5 py-2 mr-[50px]">
          <input
            placeholder="Search"
            className="focus:outline-none dark:bg-black"
          />
          <Search className="cursor-pointer" />
        </div>
      </div>

      <div className="flex gap-5 flex-wrap items-stretch mb-10">
        {data?.data.map((video) => {
          return (
            <VideoCard
              key={video._id}
              authorID={video.authorData.id}
              thumbnailUrl={video.image}
              category={video.category}
              description={video.description}
              videoLink={video.link}
              videoID={video.videoID}
              title={video.title}
              stats={{
                views:
                  video.videoStats && video.videoStats.views
                    ? video.videoStats.views
                    : 0,
                likes:
                  video.videoStats && video.videoStats.likes
                    ? video.videoStats.likes
                    : 0,
              }}
              name={video.authorData.name}
              type={video.authorData.type}
              profileUrl={video.authorData.authorImage}
            />
          );
        })}
      </div>
    </div>
  );
}
