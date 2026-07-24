import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { fetchVideoId } from "@/lib/fetchVideoData";
import Image from "next/image";
import { useEffect, useState } from "react";

type PodcastCardProps = {
  title: string;
  description: string;
  date: string;
  category: string[];
  image: string;
  tags: string[];
  videoID: string;
  link: string;
};

export default function PodcastCard({
  title,
  description,
  date,
  category,
  image,
  tags,
  videoID,
  link,
}: PodcastCardProps) {
  return (
    <div className="bg-white dark:bg-black p-5 w-full flex sm:flex-row flex-col gap-10 cursor-pointer">
      <Avatar
        className="w-[200px] border-none h-auto aspect-video rounded-xl"
        onClick={() => window.open(`/view/yt-podcasts/${videoID}`, "_blank")}
      >
        <AvatarImage src={image} alt={title} />
        <AvatarFallback>
          <Image
            src={`/images/category/${tags[0]}.jpg`}
            alt="fallback"
            width={1280}
            height={720}
          />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col w-full">
        <h1 className="font-semibold dark:text-white/70">{title}</h1>
        <h2 className="text-darkGrey dark:text-white/60">{description}</h2>
        <h2 className="dark:text-white/50">{date}</h2>
        <div className="w-fit flex gap-2">
          {category.map((tag) => (
            <div key={tag} className="bg-blue/20 dark:text-white/60 px-4 py-1">
              {tag}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
