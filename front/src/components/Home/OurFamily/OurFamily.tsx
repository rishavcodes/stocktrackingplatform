"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { getRandomUserFromCategory } from "./SortCategory";
import ChevronLeftIcon from "@/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/icons/ChevronRightIcon";
import { AnimatePresence, motion } from "framer-motion";
import SectionHeading from "../SectionHeading";
import Link from "next/link";
import InstagramIcon from "@/icons/InstagramIcon";
import LinkedinIcon from "@/icons/LinkedinIcon";
import TwitterXIcon from "@/icons/TwitterXIcon";
import YoutubeIcon from "@/icons/YoutubeIcon";
import UserFollow from "@/icons/UserFollow";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import FollowingIcon from "@/icons/FollowingIcon";
import { useDispatch } from "react-redux";
import { setfollowingData } from "@/store/slices/followingData";
import { useSelector } from "react-redux";
import { RootState } from "@/store/rootReducer";
import { useFetchFollowing } from "@/lib/data/Home/FollowingData";
import ShareIcon from "@/icons/ShareIcon";
import ShareCard from "@/components/Share/ShareCard";
import React from "react";

type ContentStats = {
  articles: number;
  videos: number;
  podcasts: number;
  events: number;
  services?: number;
};

type Stats = {
  contentStats: ContentStats;
  Followers: string[];
  recommendationStats?: {
    total?: number;
    open?: number;
    close?: number;
    returnPercentage?: number;
    returnRatio?: number;
  };
  courseStates?: {
    totalCourses?: number;
    publishedCourses?: number;
    draftCourses?: number;
    totalEnrollments?: number;
    totalRevenue?: number;
  };
  modelPortfolioStates?: {
    totalPortfolios?: number;
    activePortfolios?: number;
    closedPortfolios?: number;
    totalSubscribers?: number;
    avgReturnPercentage?: number;
    avgRiskLevel?: number;
  };
  packageStats?: {
    totalPackages?: number;
  };
};
export type SPstats = {
  _id: string;
  category: string;
  RegName: string;
  profileUrl: string;
  regNumber: string;
  email: string;
  description: string;
  companyLogo: string;
  stats: Stats;
  socials: {
    instagram: string;
    twitter: string;
    youtube: string;
    linkedin: string;
  };
  topExchange?: string | null;
  exchangeBreakdown?: { exchange: string; count: number }[];
};

const contentStatsKeys: (keyof ContentStats)[] = [
  "articles",
  "videos",
  "events",
  "podcasts",
];

const OurFamily = React.memo(() => {
  const { toast } = useToast();

  const session = useSession();

  const dispatch = useDispatch();

  const [categories, setCategories] = useState<string[]>([]);

  const followingDataArray = useSelector(
    (state: RootState) => state.followingData
  );

  const [spDataArray, setSPDataArray] = useState<SPstats[]>([]);
  const [toggle, setToggle] = useState(true);
  const [selectedArray, setSelectedArray] = useState<SPstats[]>([]);

  const { following, isLoading, isError } = useFetchFollowing(
    session.data?.user._id || "",
    session.data?.user.role || "",
    Boolean(
      session.status === "authenticated" && followingDataArray.length === 0
    )
  );

  useEffect(() => {
    if (following) {
      dispatch(setfollowingData(following));
    }
  }, [following, dispatch]);

  useEffect(() => {
    (async () => {
      const fetchData = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/data/serviceproviders`,
        { method: "GET" }
      );
      if (fetchData.status === 200) {
        const response = await fetchData.json();

        const categoriesFetch: { _id: string }[] = response.data.categories;

        const categories = categoriesFetch.map((result) => result._id);

        setSPDataArray(response.data.serviceproviders);
        setCategories(categories);

        const randomUsersFirstFive = categories
          .slice(0, 4)
          .map((category) =>
            getRandomUserFromCategory(category, response.data.serviceproviders)
          );

        setSelectedArray(
          randomUsersFirstFive.filter((user): user is SPstats => user !== null)
        );
      }
    })();
  }, []);

  const setFirstFour = useCallback(() => {
    const randomUsersFirstFive = categories
      .slice(0, 4)
      .map((category) => getRandomUserFromCategory(category, spDataArray));

    setSelectedArray(
      randomUsersFirstFive.filter((user): user is SPstats => user !== null)
    );
    setToggle(true);
  }, [spDataArray]);

  const setLastFour = useCallback(() => {
    const randomUsersNextFive = categories
      .slice(4)
      .map((category) => getRandomUserFromCategory(category, spDataArray));

    setSelectedArray(
      randomUsersNextFive.filter((user): user is SPstats => user !== null)
    );

    setToggle(false);
  }, [spDataArray]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (toggle === true) {
        setFirstFour();
      } else {
        setLastFour();
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [setFirstFour, setLastFour, toggle]);

  async function Follow(targetId: string, name: string) {
    if (session.status === "unauthenticated") {
      toast({
        title: "Error",
        description: "You need to be signed in , in order to follow someone",
        variant: "destructive",
      });
      return;
    }

    const initiatingId = session.data?.user._id;
    const role = session.data?.user.role;

    if (targetId === initiatingId) {
      toast({
        title: "Error",
        description: "You cant follow yourself",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/follow`,
        {
          method: "POST",
          body: JSON.stringify({
            targetId,
            initiatingId,
            role,
            targetName: name,
          }),
          headers: { "Content-type": "application/json" },
        }
      );

      if (res.status === 200) {
        toast({
          title: "Success",
          description: `Followed ${name}`,
          variant: "default",
        });

        const newList = [...followingDataArray, targetId];
        dispatch(setfollowingData(newList));
      } else {
        toast({
          title: "Error",
          description: "Error Following User",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error Following User",
        variant: "destructive",
      });
    }
  }

  const [isVisible, setIsVisible] = useState<string>("");

  return (
    <div className="w-full py-28 relative dark:bg-blackShade">
      <Toaster />
      <ChevronLeftIcon
        className="absolute left-0 xs:w-8 w-5 xs:h-8 h-5 top-[50%] cursor-pointer"
        onClick={setFirstFour}
      />
      <ChevronRightIcon
        className="absolute right-0 xs:w-8 w-5 xs:h-8 h-5 top-[50%] cursor-pointer"
        onClick={setLastFour}
      />

      <SectionHeading
        heading={{ text1: "Our", text2: "Family" }}
        description="Meet and follow country's experts who will help you grow your wealth."
      />

      <AnimatePresence>
        <div className="flex justify-center flex-wrap items-stretch h-auto pt-10 w-[90%] mx-auto xs:gap-3 gap-2">
          {selectedArray.map((data, idx) => {
            return (
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  delay: 0.1,
                  duration: 0.5,
                  stiffness: 50,
                  damping: 15,
                  type: "spring",
                }}
                key={data._id}
                className="flex flex-col xs:w-[240px] w-[160px] relative mx-auto justify-end items-stretch bg-blue/20 dark:bg-SPcardUpperBlackShade rounded-xl shadow-md"
              >
                <div className="absolute w-full bottom-0 bg-white dark:bg-blackShade h-[80%] border-x-green/80 border-x border-b border-b-green/80 rounded-xl"></div>

                <div className="gap-2 px-5 pb-5 pt-2 flex flex-col w-full z-10">
                  <Link
                    href={`/service-providers/${data.category}`}
                    className={`h-[fit] w-full font-semibold text-[18px]  text-center text-indigo dark:text-green cursor-pointer`}
                  >
                    {data.category}
                  </Link>
                  <div className="relative">
                    <Avatar className="w-[80%] h-auto mx-auto aspect-square border">
                      <AvatarImage
                        src={
                          data.profileUrl !== ""
                            ? data.profileUrl
                            : data.companyLogo
                        }
                        alt={data.RegName}
                        loading="lazy"
                      />
                      <AvatarFallback>
                        <Image
                          src={"/images/avatar/avatar.jpg"}
                          alt="avatar"
                          width={1280}
                          height={720}
                          loading="lazy"
                        />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center flex flex-col justify-center gap-1 items-center">
                    <div className="flex items-center gap-1">
                      <div className="ss:w-40 w-28 flex-wrap flex">
                        <Link
                          href={`/view/serviceprovider/${data._id}/articles`}
                          className="text-center truncate w-40 leading-5 sm:text-[20px] text-[15px] font-semibold gradient-text-our-family-card-name hover:bg-gradient-to-r from-darkGreen to-darkGreen cursor-pointer"
                        >
                          {data.RegName}
                        </Link>
                      </div>
                    </div>

                    <h2 className=" text-darkGrey text-[12px] flex items-center gap-1 font-medium text-center">
                      <div>SEBI Reg. {data.regNumber}</div>
                      <div
                        className="relative flex pb-1 justify-center items-center"
                        onClick={() => setIsVisible(data._id)}
                        onMouseEnter={() => setIsVisible(data._id)}
                        onMouseLeave={() => setIsVisible("")}
                      >
                        <ShareIcon className="min-w-4 w-4 h-4 min-h-4 cursor-pointer" />

                        <AnimatePresence>
                          {data._id === isVisible && (
                            <ShareCard
                              title={`${data.RegName} ${data.category} on Tradebox`}
                              separator={" | "}
                              url={`https://${window.location.hostname}/view/serviceprovider/${data._id}/articles`}
                              hashtags={[data.category]}
                            />
                          )}
                        </AnimatePresence>
                      </div>
                    </h2>
                  </div>
                  <div className="flex justify-center items-center gap-2 mb-2">
                    {data.socials &&
                      data.socials.instagram !== "" &&
                      Boolean(data.socials.instagram) && (
                        <Link
                          href={data.socials.instagram || ""}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {" "}
                          <InstagramIcon className="w-5 h-5 cursor-pointer" />
                        </Link>
                      )}

                    {data.socials &&
                      data.socials.youtube !== "" &&
                      Boolean(data.socials.youtube) && (
                        <Link
                          href={data.socials.youtube || ""}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <YoutubeIcon className="w-5 h-5 cursor-pointer" />
                        </Link>
                      )}

                    {data.socials &&
                      data.socials.twitter !== "" &&
                      Boolean(data.socials.twitter) && (
                        <Link
                          href={data.socials.twitter || ""}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <TwitterXIcon className="w-5 h-5 cursor-pointer" />
                        </Link>
                      )}
                    {data.socials &&
                      data.socials.linkedin !== "" &&
                      Boolean(data.socials.linkedin) && (
                        <Link
                          href={data.socials.linkedin || ""}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          <LinkedinIcon className="w-5 h-5 cursor-pointer" />
                        </Link>
                      )}
                  </div>
                  {!data.socials && <div></div>}
                  <div className="text-center relative font-semibold text-greenishBlue">
                    <div className="absolute bg-green/20 xs:w-[240px] w-[160px] left-[-20px] h-[25px] top-[-2px]"></div>
                    <div>
                      {data && data.stats && data.stats.Followers
                        ? `${data.stats.Followers.length} Followers`
                        : `0 Followers`}
                    </div>
                  </div>
                  <div>
                    {contentStatsKeys.map((statsKey) => {
                      return (
                        <Link
                          href={`/view/serviceprovider/${data._id}/${statsKey}`}
                          key={statsKey}
                          className="flex justify-between items-center gap-1 cursor-pointer group"
                        >
                          <div className="text-green/90 group-hover:text-darkGreen dark:group-hover:text-blue dark:text-blue/90 text-[25px] font-semibold">
                            {data.stats &&
                            data.stats.contentStats &&
                            data.stats.contentStats[statsKey] !== undefined
                              ? data.stats.contentStats[statsKey]
                              : 0}
                          </div>
                          <div className="flex justify-center w-full mx-auto gap-1">
                            <div className="w-[80%] border-b-[3px] border-b-green/80 group-hover:border-b-darkGreen dark:group-hover:border-b-blue border-dotted mb-1">
                              <div> </div>
                            </div>
                            <div className="text-green/80 text-[15px] font-medium group-hover:text-darkGreen dark:group-hover:text-blue">
                              {statsKey.charAt(0).toUpperCase() +
                                statsKey.slice(1)}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>{" "}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/view/serviceprovider/${data._id}/services`}
                      className=" bg-lightBlue text-indigo cursor-pointer w-fit ss:px-5 px-3 max-ss:text-[12px] rounded-lg py-2 mt-2 text-center self-center font-semibold"
                    >
                      Services
                    </Link>
                    {!followingDataArray.includes(data._id) ? (
                      <UserFollow
                        className="w-5 h-5 cursor-pointer ss:mt-2 mt-1"
                        onClick={() => Follow(data._id, data.RegName)}
                      />
                    ) : (
                      <Link href={`/view/serviceprovider/${data._id}/articles`}>
                        <FollowingIcon className="w-5 h-5 cursor-pointer ss:mt-2 mt-1" />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
});

OurFamily.displayName = "OurFamily";
export default React.memo(OurFamily);
