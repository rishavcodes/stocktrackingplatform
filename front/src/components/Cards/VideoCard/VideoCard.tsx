"use client";

import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { fetchVideoThumbnail } from "@/lib/fetchVideoData";
import millify from "millify";
import { Bookmark } from "lucide-react";
import { useState } from "react";
import PreviewWindow from "./PreviewWindow";
import ShareIcon from "@/icons/ShareIcon";
import ShareCard from "@/components/Share/ShareCard";

type VideoCardProps = {
  authorID: string;
  thumbnailUrl: string;
  category: string[];
  videoLink: string;
  title: string;
  videoID: string;
  stats: { views: number; likes: number };
  name: string;
  type: string;
  profileUrl: string;
  description: string;
  width?: string;
};

export default function VideoCard({
  authorID,
  thumbnailUrl,
  category,
  videoID,
  title,
  stats,
  description,
  videoLink,
  name,
  profileUrl,
  type,
  width = "sm:min-w-[200px] min-w-[150px] sm:max-w-[300px] max-w-[250px]",
}: VideoCardProps) {
  const [isPreviewWindowOpen, setIsPreviewWindowOpen] =
    useState<boolean>(false);

  const [isVisible, setIsVisible] = useState<string>("");

  return (
    <div className={`bg-white flex xs:justify-between max-xs:mx-auto flex-col ${width} p-3 gap-2 rounded-md shadow-md dark:text-black`}>
      <div
        onClick={async () => {
          // window.open(`/view/video/${await fetchVideoId(videoLink)}`, "_blank");
          setIsPreviewWindowOpen(true);
        }}
        className="flex flex-col"
      >
        {thumbnailUrl !== "" ? (
          <Avatar className="w-full h-auto aspect-videos border-none rounded-sm">
            <AvatarImage
              // width={1280}
              // height={720}
              src={thumbnailUrl}
              alt={title}
              className="object-cover"
            />
            <AvatarFallback>
              <Image
                src={`/images/category/${category[0]}.jpg`}
                alt={title}
                width={1280}
                height={720}
              />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Avatar className="w-full h-[200px] aspect-videos border-none rounded-none">
            <AvatarImage
              width={1280}
              height={720}
              src={fetchVideoThumbnail(videoLink)}
              alt={title}
            />
            <AvatarFallback>
              <Image
                src={`/images/category/${category[0]}.jpg`}
                alt={title}
                width={1280}
                height={720}
              />
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className="flex flex-wrap gap-5 items-center">
        {category.map((tag) => (
          <h1 key={tag} className="text-red-500 font-semibold">
            {tag}
          </h1>
        ))}
      </div>

      <h1 className="font-semibold dark:text-white/70">{title}</h1>
      <div className="flex gap-5 text-darkGrey/70 dark:text-white/60 text-[15px]">
        {/* {Object.entries(stats).map(([key, value], idx) => (
          <h2 key={idx}>
            {key.charAt(0).toUpperCase() + key.slice(1)} {value}
          </h2>
        ))} */}

        <div>{stats.views ? millify(stats.views) : 0} Views</div>
        <div>{stats.likes ? millify(stats.likes) : 0} Likes</div>
        {/* <div>{stats.shares} Shares</div> */}
      </div>
      <div className="flex gap-2 mt-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={profileUrl} alt={"video-avatar"} />
          <AvatarFallback>
            <Image
              src={"/images/avatar/avatar.jpg"}
              alt="avatar"
              width={1280}
              height={720}
            />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col justify-between gap-[-10px] relative w-full">
          <p className="text-[13px] absolute w-full top-1">{name}</p>
          <p className="text-darkGrey/90 text-[13px] absolute w-full bottom-0">
            {type}
          </p>
        </div>
      </div>
      <div
        className="absolute bottom-5 right-10 cursor-pointer"
        onClick={() => setIsVisible(videoID)}
        onMouseEnter={() => setIsVisible(videoID)}
        onMouseLeave={() => setIsVisible("")}
      >
        <div className="relative">
          <ShareIcon className="w-4 h-4 cursor-pointer" />

          <div>
            {videoID === isVisible && (
              <ShareCard
                title={title}
                url={`https://${window.location.hostname}/view/video/${videoID}`}
                separator=" | "
                top="bottom-4"
                hashtags={category}
              />
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 cursor-pointer">
        <Bookmark />
        {/* <BookmarkCheck /> */}
      </div>
      {isPreviewWindowOpen && (
        <PreviewWindow
          id={videoID}
          setIsPreviewWindowOpen={setIsPreviewWindowOpen}
        />
      )}
    </div>
  );
}
