"use client";

import VideoCard from "@/components/Cards/VideoCard/VideoCard";
import fetcher from "@/lib/data/setup";
import { videoType } from "@/lib/types";
import useSWR from "swr";
import { useEffect, useState } from "react";

export default function SPVideopage({ params }: { params: Promise<{ id: string }> }) {
   const [id, setId] = useState<string>("");

   useEffect(() => {
     const getId = async () => {
       const { id } = await params;
       setId(id);
     };
     getId();
   }, [params]);
  const { data } = useSWR<{ data: videoType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allvideos/previous?id=${id}`,
    fetcher
  );

  return (
    <div>
      <div className="flex flex-wrap gap-5 pt-5">
        {data?.data.map((video) => (
          <VideoCard
            key={video._id}
            thumbnailUrl={video.image}
            category={video.category}
            description={video.description}
            authorID={video.authorData.id}
            videoLink={video.link}
            title={video.title}
            videoID={video.videoID}
            stats={{
              views: video.videoStats && video.videoStats.views,
              likes: video.videoStats && video.videoStats.likes,
            }}
            name={video.authorData.name}
            type={video.authorData.type}
            profileUrl={video.authorData.authorImage}
          />
        ))}
      </div>
    </div>
  );
}
