"use client";

import VideoCard from "@/components/Cards/VideoCard/VideoCard";
import SectionHeading from "../SectionHeading";
import { motion } from "framer-motion";
import { articleType, videoType } from "@/lib/types";
import useSWR from "swr";
import fetcher from "@/lib/data/setup";
import Link from "next/link";

type responseType = {
  data: videoType[];
};

export default function TrendingVideos() {
  const { data, error, isLoading } = useSWR<responseType>(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/allvideos`,
    fetcher
  );

  // console.log("this is the video data: ", data)

  return (
    <div className="h-auto w-full flex flex-col items-center py-12">
      {/* <SectionHeading
        heading={{ text1: "Trending ", text2: "Articles" }}
        description={`Explore a curated collection of "Trending Articles" penned by top-tier financial advisors and experts, offering invaluable insights and guidance in the realm of finance.`}
      /> */}

      <h2 className="text-4xl font-league mt-4">EXPERTS TALKS</h2>
      <p className="text-lg font-league text-[#8F8F8F] w-[80%] md:w-[50vw] text-center my-3 font-light">
      Explore insightful videos from market experts, delivering analysis, strategies, and actionable perspectives to enhance your investment journey.
      </p>

      <div className="flex justify-center items-stretch gap-5 flex-wrap mt-10">
        {data?.data.slice(0, 3).map((video, idx) => (
          <motion.div
            className="flex justify-center items-stretch"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{
              delay: 0.2 * idx + 0.2,
              duration: 0.5,
              stiffness: 50,
              type: "spring",
            }}
            key={video._id}
          >
            <VideoCard
                key={video._id}
                thumbnailUrl={video.image}
                category={video.category}
                authorID={video.authorData.id}
                videoID={video.videoID}
                description={video.description}
                videoLink={video.link}
                title={video.title}
                stats={{
                  views: video?.videoStats?.views ? video?.videoStats?.views : 0,
                  likes: video?.videoStats?.likes ? video?.videoStats?.likes : 0,
                }}
                name={video.authorData.name}
                type={video.authorData.type}
                profileUrl={video.authorData.authorImage}
              />
          </motion.div>
        ))}
      </div>

      <Link href={'/market-watch/all/videos'} className="text-[##565656] text-2xl underline my-5">View all Vidoes</Link>
    </div>
  );
}
