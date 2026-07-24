"use client";
import { useState, useEffect } from "react";
import { PostRemovalBox } from "@/components";
import VideoCard from "@/components/Cards/VideoCard/VideoCard";
import { videoType } from "@/lib/types";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import fetcher from "@/lib/data/setup";
import useSWR from "swr";
import { useSession } from "next-auth/react";

export default function Videopage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    const getId = async () => {
      const { id } = await params;
      setId(id);
    };
    getId();
  }, [params]);
  const { data } = useSWR<{ data: videoType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allvideos?id=${id}`,
    fetcher
  );

  const session = useSession();

  return (
    <div className=" pl-10 items-stretch pt-10 w-full h-full">
      <Toaster />
      <Link
        href={`/dashboard/admin/serviceprovider/${id}`}
        className=" bg-green px-5 py-3"
      >
        Back
      </Link>

      <div className="flex flex-wrap gap-5 mt-10 w-full">
        {data?.data.map((video) => (
          <div key={video._id} className="relative w-full">
            <PostRemovalBox
              id={video._id}
              type="removevideo"
              token={session.data?.user.backendToken!}
            />

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
                views: video.videoStats && video.videoStats.views,
                likes: video.videoStats && video.videoStats.likes,
              }}
              name={video.authorData.name}
              type={video.authorData.type}
              profileUrl={video.authorData.authorImage}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
