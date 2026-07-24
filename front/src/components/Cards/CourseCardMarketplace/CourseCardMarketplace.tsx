"use client";

import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import ShareCard from "../../Share/ShareCard";
import { useRouter } from "next/navigation";

export type CourseType = {
  _id: string;
  title: string;
  subtitle?: string;
  description: string;
  language?: string;
  level?: string;
  price: number;
  currency?: string;
  segment?: string;
  keyFeatures?: string[];
  bonusFeatures?: string[];
  thumbnailUrl: string;
  instructorId: string;
  instructorSnapshot?: {
    name?: string;
    email?: string;
    profileUrl?: string;
  };
  status?: string;
  createdAt?: string;
  width?: string;
};

type CourseCardMarketplaceProps = CourseType & {
  width?: string;
  marketplaceSlug?: string;
};

export default function CourseCardMarketplace({
  _id,
  title,
  subtitle,
  description,
  level,
  price,
  currency = "INR",
  segment,
  keyFeatures = [],
  thumbnailUrl,
  instructorId,
  instructorSnapshot,
  createdAt,
  width = "w-full",
  marketplaceSlug,
}: CourseCardMarketplaceProps) {
  const hostname =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "";

  const [isVisible, setIsVisible] = useState<string>("");
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleMouseEnter = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };

  const handleMouseLeave = () => {
    const id = setTimeout(() => setIsVisible(""), 5000);
    setTimeoutId(id);
  };

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        shareCardRef.current &&
        !shareCardRef.current.contains(event.target as Node) &&
        isVisible === _id
      ) {
        setIsVisible("");
      }
    };
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [isVisible, _id]);

  const instructorName = instructorSnapshot?.name || "Instructor";
  const profileUrl = instructorSnapshot?.profileUrl || "/images/avatar/avatar.jpg";
  const tags = keyFeatures.length > 0 ? keyFeatures : (segment ? [segment] : []);
  const displayCategory = segment || level || "Course";

  const formatPrice = () => {
    if (currency === "INR") return `₹ ${price.toLocaleString("en-IN")}`;
    return `${currency} ${price.toLocaleString()}`;
  };

  return (
    <div
      className={`bg-white flex xs:justify-between max-xs:mx-auto flex-col ${width} p-3 gap-2 rounded-md shadow-md dark:bg-white dark:text-black`}
    >
      <div className="flex flex-col">
        <div
          className="w-full aspect-video rounded-sm overflow-hidden cursor-pointer"
          onClick={() => router.push(marketplaceSlug ? `/view/courses/${_id}?marketplace=${marketplaceSlug}` : `/view/courses/${_id}`)}
        >
          <Image
            src={thumbnailUrl || "/images/course-placeholder.jpg"}
            alt={title}
            width={400}
            height={225}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex justify-between items-center mt-1 relative">
          <h1 className="text-red-500 font-semibold capitalize">
            {displayCategory}
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-200 text-gray-700 capitalize">
            {level || "Beginner"}
          </span>
        </div>
      </div>

      <h1 className="font-semibold line-clamp-2">
        {title}
      </h1>

      {subtitle && (
        <p className="text-darkGrey/70 text-sm line-clamp-2">{subtitle}</p>
      )}

      <div className="flex items-center justify-between text-darkGrey/70 text-[15px]">
        <span className="font-semibold text-green-600">{formatPrice()}</span>
        {createdAt && (
          <span>
            {new Date(createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "2-digit",
            })}
          </span>
        )}
      </div>

      <p className="text-darkGrey/90 leading-[19px] line-clamp-3">
        {description}
      </p>

      <div
        className="cursor-pointer text-blue-600 font-medium text-sm"
        onClick={() => router.push(marketplaceSlug ? `/view/courses/${_id}?marketplace=${marketplaceSlug}` : `/view/courses/${_id}`)}
      >
        View Course
      </div>

      <div>
        <Link
          href={marketplaceSlug ? `/marketplace/${marketplaceSlug}/experts/${instructorId}/courses` : `/marketplace/serviceprovider/${instructorId}/courses`}
          className="flex gap-2 mt-2"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={profileUrl} alt={instructorName} />
            <AvatarFallback>
              <Image
                src="/images/avatar/avatar.jpg"
                alt="avatar"
                width={40}
                height={40}
              />
            </AvatarFallback>
          </Avatar>

          <div className="flex flex-col justify-between gap-[-10px] relative w-full">
            <p className="text-[12px] absolute w-full top-1 font-jakarta font-bold">
              {instructorName}
            </p>
            <p className="text-darkGrey/90 text-[13px] absolute w-full bottom-0">
              {displayCategory}
            </p>
          </div>
        </Link>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-3 text-blue mt-3">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-[#EEF7FA] px-5 text-[13px] py-1 rounded-md"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
