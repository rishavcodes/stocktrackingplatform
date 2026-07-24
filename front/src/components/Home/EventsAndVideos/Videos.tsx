"use client";

import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { fetchVideoId, fetchVideoThumbnail } from "@/lib/fetchVideoData";
import PlayPolygonIcon from "@/icons/PlayPolygonIcon";
import { motion } from "framer-motion";
import millify from "millify";
import { videoType } from "@/lib/types";
import Link from "next/link";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";

export default function Videos() {
  const { data } = useSWR<{ data: videoType[] }>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allvideos`,
    fetcher
  );

  return (
    <div className=" bg-white dark:bg-darkGrey/20 rounded-2xl pb-5 w-full font-jakarta">
      <h1 className="text-center text-[25px] rounded-t-2xl py-5 bg-green/30 dark:bg-SPcardUpperBlackShade dark:text-green font-semibold text-darkGreen">
        TRENDING VIDEOS
      </h1>
      <div className="grid xs:grid-cols-2 grid-cols-1 gap-2 mt-5 overflow-auto xs:h-[300px] h-[400px] px-5 scrollbar-thumb-rounded-full scrollbar-thin scrollbar-track-rounded-full scrollbar-thumb-darkGrey/60">
        {data?.data.map((video, idx) => {
          return (
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{
                delay: idx < 4 ? 0.2 * idx + 0.2 : 0.2,
                duration: 0.5,
                stiffness: 70,
                type: "spring",
              }}
              key={video._id}
              className="rounded-xl w-full bg-darkGrey/[10%] dark:bg-black hover:bg-blue/20 flex mx-auto flex-col xs:gap-5 py-2 cursor-pointer"
            >
              <div className="px-2 flex h-full flex-col gap-3 items-stretch justify-between">
                <div className="flex flex-col gap-2">
                  <div
                    onClick={async () => {
                      window.open(
                        `/view/video/${await fetchVideoId(video.link)}`,
                        "_blank"
                      );
                    }}
                    className=" relative"
                  >
                    <div className="absolute w-12 h-12 z-20 opacity-70 left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%]">
                      <PlayPolygonIcon />
                    </div>

                    {video.image !== "" ? (
                      <Avatar className="w-full mx-auto rounded-xl max-xs:mx-auto h-auto aspect-videos max-ss:border-b border-none">
                        <AvatarImage
                          className="aspect-video object-cover"
                          src={video.image}
                          alt={video.title}
                        />
                        <AvatarFallback>
                          <Image
                            src={`/images/category/${video.category[0]}.jpg`}
                            alt={video.title}
                            width={1280}
                            height={720}
                            className="aspect-video object-cover"
                          />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="w-full max-xs:mx-auto h-auto aspect-videos max-ss:border-b border-none rounded-none">
                        <AvatarImage
                          className="aspect-video object-cover"
                          src={fetchVideoThumbnail(video.link)}
                          alt={video.title}
                        />
                        <AvatarFallback>
                          <Image
                            src={`/images/category/${video.category[0]}.jpg`}
                            alt={video.title}
                            width={1280}
                            height={720}
                            className="aspect-video object-cover"
                          />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  <div className="flex flex-col">
                    {" "}
                    <h2 className=" text-indigo text-[14px] font-bold dark:text-blue">
                      {video.title}
                    </h2>
                    <p className="text-darkGrey dark:text-white/50 font-semibold text-[12px] break-all">
                      {video.description.split(" ").slice(0, 10).join(" ") +
                        "...."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-2">
                  <div className="flex items-center flex-row  gap-3 justify-between px-1">
                    <Link
                      href={`/view/serviceprovider/${video.authorData.id}/videos`}
                      className="flex items-center justify-between gap-1"
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarImage
                          src={video.authorData.authorImage}
                          alt={video._id}
                        />
                        <AvatarFallback>
                          <Image
                            src={"/images/avatar/avatar.jpg"}
                            alt="avatar"
                            width={1280}
                            height={720}
                          />
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-[12px] font-semibold dark:text-white/50">
                        {video.authorData.name}
                      </div>
                    </Link>

                    <div className="flex flex-col text-[12px] font-semibold text-black dark:text-white/50">
                      <div>
                        {video.videoStats && video.videoStats.views
                          ? millify(video.videoStats.views)
                          : 0}
                        Views
                      </div>
                      <div>
                        {video.videoStats && video.videoStats.likes
                          ? millify(video.videoStats.likes)
                          : 0}{" "}
                        Likes
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
