"use client";
import { useState, useEffect } from "react";
import { PostRemovalBox } from "@/components";
import PodcastCard from "@/components/PodcastCard/PodcastCard";
import { podcastType } from "@/lib/types";
import Link from "next/link";

import { Toaster } from "@/components/ui/toaster";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import { useSession } from "next-auth/react";

export default function Podcastpage({ params }: { params: Promise<{ id: string }> }) {
   const [id, setId] = useState<string>("");
      
        useEffect(() => {
          const getId = async () => {
            const { id } = await params;
            setId(id);
          };
          getId();
        }, [params]);
  const { data } = useSWR<{ data: podcastType }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/post/allpodcasts?id=${id}`,
    fetcher
  );

  const session = useSession();

  return (
    <div className="pl-10 items-stretch pt-10 w-full h-full">
      <Toaster />
      <Link
        href={`/dashboard/admin/serviceprovider/${id}`}
        className=" bg-green px-5 py-3"
      >
        Back
      </Link>

      <div className="flex flex-col flex-wraps gap-5 mt-10">
        {data?.data.map((podcast) => (
          <div
            key={podcast._id}
            className="flex justify-center relative items-stretch"
          >
            <PostRemovalBox
              id={podcast._id}
              type="removepodcast"
              token={session.data?.user.backendToken!}
            />

            <PodcastCard
              link={podcast.link}
              key={podcast._id}
              title={podcast.title}
              videoID={podcast.videoID}
              description={podcast.description}
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
          </div>
        ))}
      </div>
    </div>
  );
}
