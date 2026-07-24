"use client";

import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import ShareIcon from "@/icons/ShareIcon";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import ShareCard from "../../Share/ShareCard";
import Like from "@/icons/Like";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type ArticleCardProps = {
  articleId: string;
  authorId: string;
  url: string;
  category: string;
  heading: string;
  dateAndRead: string[];
  paragraph: string;
  profileUrl: string;
  name: string;
  tags: string[];
  hasArticlePDF: boolean;
  width?: string;
};

export default function ArticleCard({
  articleId,
  authorId,
  url,
  category,
  heading,
  dateAndRead,
  paragraph,
  profileUrl,
  name,
  hasArticlePDF,
  tags,
  width = "sm:min-w-[200px] min-w-[150px] sm:max-w-[300px] max-w-[250px]",
}: ArticleCardProps) {
  const hostname =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "";

  const [isVisible, setIsVisible] = useState<string>("");
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const session = useSession();

  // Function to clear the timeout when the mouse enters the ShareCard
  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  // Function to set the timeout to close the ShareCard after 5 seconds
  const handleMouseLeave = () => {
    const id = setTimeout(() => {
      setIsVisible("");
    }, 5000);
    setTimeoutId(id);
  };

  // Effect to close the share card when clicking outside
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        shareCardRef.current &&
        !shareCardRef.current.contains(event.target as Node) &&
        isVisible === articleId
      ) {
        setIsVisible("");
      }
    };

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [isVisible, articleId]);

  const router = useRouter();
  const userId = session?.data?.user._id;

  const handleLike = async () => {
    // Like button functionality
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/like`,
      {
        method: "POST",
        body: JSON.stringify({ articleId, userId }),
        headers: { "Content-type": "application/json" },
      }
    );

    if (response.status === 200) {
      const { data } = await response.json();
      console.log(data)
    } else return [];
  };

  return (
    <div
      className={`bg-white flex xs:justify-between max-xs:mx-auto flex-col ${width} p-3 gap-2 rounded-md shadow-md dark:text-black`}
    >
      <div className="flex flex-col">
        <Avatar className="w-full border-none h-auto aspect-video rounded-sm">
          <AvatarImage src={url} alt={heading} className="object-cover" />
          <AvatarFallback>
            <Image
              src={`/images/category/${tags[0]}.jpg`}
              alt="fallback"
              width={1280}
              height={720}
            />
          </AvatarFallback>
        </Avatar>

        <div className="flex justify-between items-center mt-1 relative">
          <h1 className="text-red-500 font-semibold">{category}</h1>

          <AnimatePresence>
            {articleId === isVisible && (
              <div
                ref={shareCardRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="absolute top-0 left-full ml-2 z-10"
              >
                <ShareCard
                  title={`${heading} - `}
                  separator="Read more at :-"
                  url={`https://${hostname}/view/researchreport/page/${articleId}`}
                  hashtags={tags}
                />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <h1 className="font-semibold">
        {heading.split(" ").slice(0, 10).join(" ") + "...."}
      </h1>
      <div className="flex gap-5 text-darkGrey/70 text-[15px]">
        {dateAndRead.map((data) => (
          <h2 key={data}>{data}</h2>
        ))}
      </div>
      <p className="text-darkGrey/90 leading-[19px]">
        {paragraph.split(" ").slice(0, 10).join(" ") + "...."}
      </p>

      {paragraph.length < 50 && hasArticlePDF ? (
        <div
          className="bg-green dark:text-black px-3 py-1 w-fit cursor-pointer rounded-md font-jakarta font-semibold text-[12px]"
          onClick={() => {
            window.open(`/view/researchreport/pdf/${articleId}`);
          }}
        >
          View PDF
        </div>
      ) : (
        <div
          className="cursor-pointer"
          onClick={() => {
            router.push(`/view/researchreport/page/${articleId}`);
          }}
        >
          Read More
        </div>
      )}

      <div className="">
        <Link
          href={`/view/serviceprovider/${authorId}/articles`}
          className="flex gap-2 mt-2"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileUrl} alt={heading} />
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
            <p className="text-[12px] absolute w-full top-1 font-jakarta font-bold">
              {name}
            </p>
            <p className="text-darkGrey/90 text-[13px] absolute w-full bottom-0">
              {category}
            </p>
          </div>
        </Link>

        <div className="flex flex-wrap gap-3 text-blue mt-3">
          {tags.map((tag) => (
            <Link
              href={`/market-watch/${tag}/articles`}
              key={tag}
              className="bg-[#EEF7FA] px-5 text-[13px] py-1 rounded-md cursor-pointer"
            >
              {tag}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
